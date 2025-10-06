'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DollarSign, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface EventBalanceViewProps {
  eventId: string;
  balance?: Array<{
    user: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
    totalPaid: number;
    totalOwed: number;
    netBalance: number;
  }>;
}

export function EventBalanceView({ eventId, balance }: EventBalanceViewProps) {
  if (!balance || balance.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No balance data</h3>
          <p className="text-gray-500">Add some expenses to see the balance breakdown.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate who owes what to whom
  const creditors = balance.filter(b => b.netBalance > 0.01).sort((a, b) => b.netBalance - a.netBalance);
  const debtors = balance.filter(b => b.netBalance < -0.01).sort((a, b) => a.netBalance - b.netBalance);

  const settlements: Array<{
    from: typeof balance[0];
    to: typeof balance[0];
    amount: number;
  }> = [];

  // Simple settlement algorithm
  let debtorIndex = 0;
  for (const creditor of creditors) {
    let remaining = creditor.netBalance;
    
    while (remaining > 0.01 && debtorIndex < debtors.length) {
      const debtor = debtors[debtorIndex];
      const settlementAmount = Math.min(remaining, Math.abs(debtor.netBalance));
      
      settlements.push({
        from: debtor,
        to: creditor,
        amount: settlementAmount,
      });
      
      remaining -= settlementAmount;
      debtor.netBalance += settlementAmount;
      
      if (Math.abs(debtor.netBalance) < 0.01) {
        debtorIndex++;
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {balance.map((userBalance) => (
          <Card key={userBalance.user.id}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userBalance.user.avatarUrl || undefined} />
                  <AvatarFallback>
                    {userBalance.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{userBalance.user.name}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Paid: ${userBalance.totalPaid.toFixed(2)}</div>
                    <div>Owed: ${userBalance.totalOwed.toFixed(2)}</div>
                  </div>
                </div>
                <div className="text-right">
                  {Math.abs(userBalance.netBalance) < 0.01 ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Settled
                    </Badge>
                  ) : userBalance.netBalance > 0 ? (
                    <Badge variant="default" className="text-green-600 bg-green-50">
                      +${userBalance.netBalance.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-red-600 bg-red-50">
                      -${Math.abs(userBalance.netBalance).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Settlements */}
      {settlements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Suggested Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {settlements.map((settlement, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={settlement.from.user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {settlement.from.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{settlement.from.user.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">owes</span>
                    <Badge variant="outline" className="font-mono">
                      ${settlement.amount.toFixed(2)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">to</span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={settlement.to.user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {settlement.to.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{settlement.to.user.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All settled up!</h3>
            <p className="text-gray-500">Everyone's balances are even. No settlements needed.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}