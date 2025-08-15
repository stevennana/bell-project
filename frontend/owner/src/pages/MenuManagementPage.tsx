import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  Save, 
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  useMenu, 
  usePublishedMenu,
  useDraftMenu,
  useCreateMenuItem, 
  useUpdateMenuItem, 
  useDeleteMenuItem, 
  usePublishMenu,
  useConfirmDraft,
  useCategories,
  useCreateCategory,
  useUpdateCategory
} from '../hooks/useApi';
import type { MenuItem, Category, CreateCategoryRequest } from '../types/api';

interface MenuManagementPageProps {
  restaurantId: string;
}

export const MenuManagementPage: React.FC<MenuManagementPageProps> = ({
  restaurantId
}) => {
  // API hooks
  const { data: publishedMenu, isLoading: publishedLoading, error: publishedError } = usePublishedMenu(restaurantId);
  const { data: draftMenu, isLoading: draftLoading, error: draftError } = useDraftMenu(restaurantId);
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(restaurantId);
  const createMenuItem = useCreateMenuItem(restaurantId);
  const updateMenuItem = useUpdateMenuItem(restaurantId);
  const deleteMenuItem = useDeleteMenuItem(restaurantId);
  const publishMenu = usePublishMenu(restaurantId);
  const confirmDraft = useConfirmDraft(restaurantId);
  const createCategory = useCreateCategory(restaurantId);
  const updateCategory = useUpdateCategory(restaurantId);

  // State for viewing mode
  const [viewMode, setViewMode] = useState<'published' | 'draft'>('draft');
  
  // Determine which menu to show based on view mode and availability
  const currentMenuData = viewMode === 'draft' && draftMenu 
    ? draftMenu 
    : publishedMenu;
  
  const menuItems = currentMenuData?.items || [];
  const hasDraftChanges = draftMenu !== null;
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Category management state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<CreateCategoryRequest>({
    name: '',
    displayName: ''
  });
  
  // Get active categories only for filtering and display
  const activeCategories = categories.filter(cat => cat.active);
  const defaultCategory = activeCategories.length > 0 ? activeCategories[0].name : 'general';

  const [newItem, setNewItem] = useState<Omit<MenuItem, 'id'>>({
    name: '',
    description: '',
    price: 0,
    category: defaultCategory,
    available: true,
    options: []
  });

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const handleCreateSubmit = async () => {
    try {
      await createMenuItem.mutateAsync(newItem);
      setNewItem({
        name: '',
        description: '',
        price: 0,
        category: defaultCategory,
        available: true,
        options: []
      });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create item:', error);
      alert('Failed to create menu item. Please try again.');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.displayName) {
      alert('Please fill in both name and display name for the category');
      return;
    }

    try {
      await createCategory.mutateAsync({
        ...newCategory,
        order: categories.length
      });
      setNewCategory({ name: '', displayName: '' });
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category. Please try again.');
    }
  };

  const handleToggleCategoryStatus = async (categoryId: string, currentStatus: boolean) => {
    // If deactivating a category, show warning about menu items
    if (currentStatus) {
      const category = categories.find(cat => cat.id === categoryId);
      const categoryName = category?.displayName || 'this category';
      const itemsInCategory = menuItems.filter(item => item.category === category?.name).length;
      
      if (itemsInCategory > 0) {
        const confirmMessage = `Deactivating "${categoryName}" will affect ${itemsInCategory} menu item(s) in this category. Menu items in inactive categories won't be available for new orders. Continue?`;
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
    }

    try {
      await updateCategory.mutateAsync({
        categoryId,
        updates: { active: !currentStatus }
      });
      
      if (!currentStatus) {
        alert('Category activated! You can now add menu items to this category.');
      } else {
        alert('Category deactivated! Menu items in this category are no longer available for ordering.');
      }
    } catch (error) {
      console.error('Failed to update category status:', error);
      alert('Failed to update category status.');
    }
  };

  const handleToggleAvailability = async (id: string, available: boolean) => {
    try {
      await updateMenuItem.mutateAsync({ id, updates: { available: !available } });
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('Failed to update item availability.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await deleteMenuItem.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete menu item.');
      }
    }
  };

  const handlePublishMenu = async () => {
    if (window.confirm('Are you sure you want to publish the menu? This will make it live for customers.')) {
      try {
        await publishMenu.mutateAsync();
        alert('Menu published successfully!');
      } catch (error) {
        console.error('Failed to publish menu:', error);
        alert('Failed to publish menu.');
      }
    }
  };

  // Loading state
  if (publishedLoading || draftLoading || categoriesLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">Loading menu data...</p>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (publishedError && draftError) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-red-600">Error loading menu data</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600">Manage your restaurant menu items and options</p>
            
            {/* Status indicator */}
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Viewing:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('published')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'published'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Published
                  </button>
                  <button
                    onClick={() => setViewMode('draft')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === 'draft'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Draft {hasDraftChanges && <span className="ml-1 w-2 h-2 bg-orange-500 rounded-full inline-block"></span>}
                  </button>
                </div>
              </div>
              
              {hasDraftChanges && viewMode === 'draft' && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Unpublished Changes
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="btn-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Manage Categories
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </button>
            
            {hasDraftChanges && (
              <button
                onClick={async () => {
                  if (draftMenu?.version && window.confirm('Publish draft changes? This will make them visible to customers.')) {
                    try {
                      await confirmDraft.mutateAsync(draftMenu.version);
                    } catch (error) {
                      alert('Failed to publish changes. Please try again.');
                    }
                  }
                }}
                disabled={confirmDraft.isPending}
                className="btn-secondary bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                {confirmDraft.isPending ? 'Publishing...' : 'Publish Draft'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedCategory === 'all'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All ({menuItems.length})
            </button>
            {activeCategories.map((category) => {
              const count = menuItems.filter(item => item.category === category.name).length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedCategory === category.name
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {category.displayName} ({count})
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Create New Item Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Menu Item</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    rows={3}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (KRW)</label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="input"
                  >
                    {activeCategories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsCreating(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubmit}
                  className="btn-primary"
                  disabled={createMenuItem.isPending}
                >
                  {createMenuItem.isPending ? 'Creating...' : 'Create Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Category Management</h3>
              
              {/* Existing Categories */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3">Existing Categories</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center">
                        <span className={`text-sm ${category.active ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                          {category.displayName}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">
                          ({category.name})
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleCategoryStatus(category.id, category.active)}
                        className={`px-2 py-1 text-xs rounded ${
                          category.active 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                        disabled={updateCategory.isPending}
                      >
                        {category.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Create New Category */}
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-3">Add New Category</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name (internal)</label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="e.g., appetizers"
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input
                      type="text"
                      value={newCategory.displayName}
                      onChange={(e) => setNewCategory({...newCategory, displayName: e.target.value})}
                      placeholder="e.g., Appetizers"
                      className="input"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="btn-primary"
                  disabled={createCategory.isPending || !newCategory.name || !newCategory.displayName}
                >
                  {createCategory.isPending ? 'Creating...' : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="card shadow-md">
            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-100">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                <button
                  onClick={() => handleToggleAvailability(item.id, item.available)}
                  className={`p-1 rounded ${item.available ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {item.available ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{item.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(item.price)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {item.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              
              {item.options && item.options.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500">
                    {item.options.length} option{item.options.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => console.log('Edit item:', item.id)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-red-400 hover:text-red-600"
                  disabled={deleteMenuItem.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No menu items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first menu item.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
};