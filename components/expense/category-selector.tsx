'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { Plus, X } from 'lucide-react';

interface CategorySelectorProps {
  selectedCategoryId?: string;
  onCategoryChange: (categoryId: string | null) => void;
  disabled?: boolean;
}

export function CategorySelector({ 
  selectedCategoryId, 
  onCategoryChange, 
  disabled = false 
}: CategorySelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6B7280');

  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.category.getAll.useQuery();
  const createCategory = trpc.category.create.useMutation();

  const selectedCategory = categories?.find(cat => cat.id === selectedCategoryId) || null;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        color: newCategoryColor,
      });
      
      await utils.category.getAll.invalidate();
      setNewCategoryName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const defaultColors = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#84CC16', // Lime
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#9CA3AF', // Cool Gray
  ];

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex items-center justify-center h-10 border rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Category</Label>
      
      {/* Selected Category Display */}
      {selectedCategory && (
        <div className="flex items-center space-x-2">
          <div 
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: selectedCategory.color }}
          >
            {selectedCategory.icon && <span className="mr-1">{selectedCategory.icon}</span>}
            {selectedCategory.name}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCategoryChange(null)}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Category Selection */}
      {!selectedCategory && (
        <div className="space-y-3">
          {/* Default Categories */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Default Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categories?.filter(cat => cat.type === 'default').map((category) => (
                <Button
                  key={category.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onCategoryChange(category.id)}
                  disabled={disabled}
                  className="text-xs"
                >
                  {category.icon && <span className="mr-1">{category.icon}</span>}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Categories */}
          {categories && categories.filter(cat => cat.type === 'custom').length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Your Categories</h4>
              <div className="flex flex-wrap gap-2">
                {categories?.filter(cat => cat.type === 'custom').map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onCategoryChange(category.id)}
                    disabled={disabled}
                    className="text-xs"
                    style={{ borderColor: category.color }}
                  >
                    {category.icon && <span className="mr-1">{category.icon}</span>}
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Category Button */}
          <div>
            {!showCreateForm ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                disabled={disabled}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create New Category
              </Button>
            ) : (
              <Card className="p-3">
                <CardHeader className="p-0 pb-2">
                  <CardTitle className="text-sm">Create New Category</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <form onSubmit={handleCreateCategory} className="space-y-3">
                    <div>
                      <Label htmlFor="categoryName" className="text-xs">Name</Label>
                      <Input
                        id="categoryName"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name"
                        className="text-sm"
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Color</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {defaultColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-full border-2 ${
                              newCategoryColor === color ? 'border-gray-900' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewCategoryColor(color)}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newCategoryName.trim() || createCategory.isPending}
                        className="text-xs"
                      >
                        {createCategory.isPending ? 'Creating...' : 'Create'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewCategoryName('');
                        }}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}