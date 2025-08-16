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
  usePublishedMenu,
  useDraftMenu,
  useCreateMenuItem, 
  useUpdateMenuItem, 
  useDeleteMenuItem, 
  useConfirmDraft,
  useCategories,
  useCreateCategory,
  useUpdateCategory
} from '../hooks/useApi';
import type { MenuItem, Category, CreateCategoryRequest, MenuOption, OptionChoice } from '../types/api';

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
  
  // Item editing state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('edit');
  
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
    // Only allow availability changes in draft mode
    if (viewMode !== 'draft') {
      alert('You can only change item availability in draft mode. Switch to draft view to make changes.');
      return;
    }
    
    try {
      await updateMenuItem.mutateAsync({ id, updates: { available: !available } });
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('Failed to update item availability.');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    if (viewMode === 'draft') {
      setModalMode('edit');
    } else {
      setModalMode('view');
    }
    setIsOptionsModalOpen(true);
  };

  const handleSaveItemOptions = async (updatedItem: MenuItem) => {
    try {
      await updateMenuItem.mutateAsync({ 
        id: updatedItem.id, 
        updates: { 
          name: updatedItem.name,
          description: updatedItem.description,
          price: updatedItem.price,
          category: updatedItem.category,
          available: updatedItem.available,
          options: updatedItem.options 
        } 
      });
      setIsOptionsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item.');
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
              onClick={() => {
                if (viewMode !== 'draft') {
                  alert('You can only add items in draft mode. Switch to draft view to add new items.');
                  return;
                }
                setIsCreating(true);
              }}
              className="btn-primary"
              disabled={viewMode !== 'draft'}
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
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <CreateItemModal
          item={newItem}
          activeCategories={activeCategories}
          onClose={() => setIsCreating(false)}
          onSave={handleCreateSubmit}
          onChange={setNewItem}
          isLoading={createMenuItem.isPending}
        />
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

      {/* Item Editor Modal */}
      {editingItem && (
        <ItemEditor
          item={editingItem}
          activeCategories={activeCategories}
          isOpen={isOptionsModalOpen}
          onClose={() => {
            setIsOptionsModalOpen(false);
            setEditingItem(null);
            setModalMode('edit');
          }}
          onSave={handleSaveItemOptions}
          mode={modalMode}
        />
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
                  className={`p-1 rounded ${
                    viewMode === 'draft' 
                      ? (item.available ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500')
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  disabled={viewMode !== 'draft'}
                  title={viewMode !== 'draft' ? 'Switch to draft mode to change availability' : 'Toggle availability'}
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
                  onClick={() => handleEditItem(item)}
                  className={`p-2 ${viewMode === 'draft' 
                    ? 'text-gray-400 hover:text-gray-600' 
                    : 'text-blue-400 hover:text-blue-600'
                  }`}
                  title={viewMode !== 'draft' ? 'View item details' : 'Edit item'}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    if (viewMode !== 'draft') {
                      alert('You can only delete items in draft mode. Switch to draft view to delete items.');
                      return;
                    }
                    handleDeleteItem(item.id);
                  }}
                  className={`p-2 ${viewMode === 'draft' 
                    ? 'text-red-400 hover:text-red-600' 
                    : 'text-gray-300 cursor-not-allowed'
                  }`}
                  disabled={deleteMenuItem.isPending || viewMode !== 'draft'}
                  title={viewMode !== 'draft' ? 'Switch to draft mode to delete items' : 'Delete item'}
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

// Item Editor Component
interface ItemEditorProps {
  item: MenuItem;
  activeCategories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
  mode: 'edit' | 'view';
}

const ItemEditor: React.FC<ItemEditorProps> = ({ item, activeCategories, isOpen, onClose, onSave, mode }) => {
  const [editedItem, setEditedItem] = useState<MenuItem>(item);
  const [currentTab, setCurrentTab] = useState<'basic' | 'options'>('basic');

  // Reset edited item when item changes
  React.useEffect(() => {
    setEditedItem(item);
  }, [item]);

  if (!isOpen) return null;

  const addOption = () => {
    const newOption: MenuOption = {
      id: `option-${Date.now()}`,
      name: '',
      required: false,
      choices: []
    };
    setEditedItem(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }));
  };

  const updateOption = (index: number, updates: Partial<MenuOption>) => {
    setEditedItem(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, ...updates } : option
      )
    }));
  };

  const removeOption = (index: number) => {
    setEditedItem(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const addChoice = (optionIndex: number) => {
    const newChoice: OptionChoice = {
      id: `choice-${Date.now()}`,
      name: '',
      priceModifier: 0
    };
    setEditedItem(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === optionIndex 
          ? { ...option, choices: [...option.choices, newChoice] }
          : option
      )
    }));
  };

  const updateChoice = (optionIndex: number, choiceIndex: number, updates: Partial<OptionChoice>) => {
    setEditedItem(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === optionIndex 
          ? {
              ...option,
              choices: option.choices.map((choice, j) => 
                j === choiceIndex ? { ...choice, ...updates } : choice
              )
            }
          : option
      )
    }));
  };

  const removeChoice = (optionIndex: number, choiceIndex: number) => {
    setEditedItem(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === optionIndex 
          ? { ...option, choices: option.choices.filter((_, j) => j !== choiceIndex) }
          : option
      )
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {mode === 'edit' ? 'Edit Menu Item' : 'View Menu Item'}
              </h3>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'basic'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setCurrentTab('options')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'options'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Options ({editedItem.options.length})
              </button>
            </nav>
          </div>

          {/* Basic Info Tab */}
          {currentTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editedItem.name}
                  onChange={(e) => mode === 'edit' && setEditedItem({...editedItem, name: e.target.value})}
                  className={`input ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  readOnly={mode === 'view'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editedItem.description}
                  onChange={(e) => mode === 'edit' && setEditedItem({...editedItem, description: e.target.value})}
                  rows={3}
                  className={`input ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  readOnly={mode === 'view'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Price (KRW)</label>
                <input
                  type="number"
                  value={editedItem.price}
                  onChange={(e) => mode === 'edit' && setEditedItem({...editedItem, price: Number(e.target.value)})}
                  className={`input ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  readOnly={mode === 'view'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={editedItem.category}
                  onChange={(e) => mode === 'edit' && setEditedItem({...editedItem, category: e.target.value})}
                  className={`input ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  disabled={mode === 'view'}
                >
                  {activeCategories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="item-available"
                  checked={editedItem.available}
                  onChange={(e) => mode === 'edit' && setEditedItem({...editedItem, available: e.target.checked})}
                  className={`h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded ${mode === 'view' ? 'cursor-not-allowed' : ''}`}
                  disabled={mode === 'view'}
                />
                <label htmlFor="item-available" className="ml-2 block text-sm text-gray-900">
                  Available for ordering
                </label>
              </div>
            </div>
          )}

          {/* Options Tab */}
          {currentTab === 'options' && (
            <div className="space-y-6">
            {editedItem.options.map((option, optionIndex) => (
              <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Option Name</label>
                      <input
                        type="text"
                        value={option.name}
                        onChange={(e) => mode === 'edit' && updateOption(optionIndex, { name: e.target.value })}
                        placeholder="e.g., Size, Spice Level"
                        className={`input ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        readOnly={mode === 'view'}
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`required-${optionIndex}`}
                        checked={option.required}
                        onChange={(e) => mode === 'edit' && updateOption(optionIndex, { required: e.target.checked })}
                        className={`h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded ${mode === 'view' ? 'cursor-not-allowed' : ''}`}
                        disabled={mode === 'view'}
                      />
                      <label htmlFor={`required-${optionIndex}`} className="ml-2 block text-sm text-gray-900">
                        Required option
                      </label>
                    </div>
                  </div>
                  {mode === 'edit' && (
                    <button
                      onClick={() => removeOption(optionIndex)}
                      className="ml-4 p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Choices */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-900">Choices</h4>
                    {mode === 'edit' && (
                      <button
                        onClick={() => addChoice(optionIndex)}
                        className="btn-secondary text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Choice
                      </button>
                    )}
                  </div>
                  
                  {option.choices.map((choice, choiceIndex) => (
                    <div key={choice.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={choice.name}
                          onChange={(e) => mode === 'edit' && updateChoice(optionIndex, choiceIndex, { name: e.target.value })}
                          placeholder="Choice name"
                          className={`input text-sm ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                          readOnly={mode === 'view'}
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={choice.priceModifier}
                          onChange={(e) => mode === 'edit' && updateChoice(optionIndex, choiceIndex, { priceModifier: Number(e.target.value) })}
                          placeholder="Price modifier"
                          className={`input text-sm ${mode === 'view' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                          readOnly={mode === 'view'}
                        />
                      </div>
                      <div className="text-xs text-gray-500 w-16">
                        {choice.priceModifier !== 0 && (
                          <span className={choice.priceModifier > 0 ? 'text-orange-600' : 'text-green-600'}>
                            {choice.priceModifier > 0 ? '+' : ''}{formatCurrency(choice.priceModifier)}
                          </span>
                        )}
                      </div>
                      {mode === 'edit' && (
                        <button
                          onClick={() => removeChoice(optionIndex, choiceIndex)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {option.choices.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No choices added yet</p>
                  )}
                </div>
              </div>
            ))}
            
            {editedItem.options.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="flex flex-col items-center">
                  <div className="text-4xl mb-3">⚙️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No options configured</h3>
                  <p className="text-gray-500 mb-4">
                    {mode === 'edit' 
                      ? 'Add options like size, spice level, or toppings to this menu item'
                      : 'This menu item has no options configured'
                    }
                  </p>
                  {mode === 'edit' && (
                    <button
                      onClick={addOption}
                      className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Option
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Add Option Button - only show when options already exist */}
            {editedItem.options.length > 0 && mode === 'edit' && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={addOption}
                  className="btn-secondary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Option
                </button>
              </div>
            )}
          </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              {mode === 'edit' ? 'Cancel' : 'Close'}
            </button>
            {mode === 'edit' && (
              <button
                onClick={() => onSave(editedItem)}
                className="btn-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Item Modal Component
interface CreateItemModalProps {
  item: Omit<MenuItem, 'id'>;
  activeCategories: Category[];
  onClose: () => void;
  onSave: () => void;
  onChange: (item: Omit<MenuItem, 'id'>) => void;
  isLoading: boolean;
}

const CreateItemModal: React.FC<CreateItemModalProps> = ({ 
  item, 
  activeCategories, 
  onClose, 
  onSave, 
  onChange, 
  isLoading 
}) => {
  const [currentTab, setCurrentTab] = useState<'basic' | 'options'>('basic');

  const addOption = () => {
    const newOption: MenuOption = {
      id: `option-${Date.now()}`,
      name: '',
      required: false,
      choices: []
    };
    onChange({
      ...item,
      options: [...item.options, newOption]
    });
  };

  const updateOption = (index: number, updates: Partial<MenuOption>) => {
    onChange({
      ...item,
      options: item.options.map((option, i) => 
        i === index ? { ...option, ...updates } : option
      )
    });
  };

  const removeOption = (index: number) => {
    onChange({
      ...item,
      options: item.options.filter((_, i) => i !== index)
    });
  };

  const addChoice = (optionIndex: number) => {
    const newChoice: OptionChoice = {
      id: `choice-${Date.now()}`,
      name: '',
      priceModifier: 0
    };
    onChange({
      ...item,
      options: item.options.map((option, i) => 
        i === optionIndex 
          ? { ...option, choices: [...option.choices, newChoice] }
          : option
      )
    });
  };

  const updateChoice = (optionIndex: number, choiceIndex: number, updates: Partial<OptionChoice>) => {
    onChange({
      ...item,
      options: item.options.map((option, i) => 
        i === optionIndex 
          ? {
              ...option,
              choices: option.choices.map((choice, j) => 
                j === choiceIndex ? { ...choice, ...updates } : choice
              )
            }
          : option
      )
    });
  };

  const removeChoice = (optionIndex: number, choiceIndex: number) => {
    onChange({
      ...item,
      options: item.options.map((option, i) => 
        i === optionIndex 
          ? { ...option, choices: option.choices.filter((_, j) => j !== choiceIndex) }
          : option
      )
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Add New Menu Item</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentTab('basic')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'basic'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Basic Info
              </button>
              <button
                onClick={() => setCurrentTab('options')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentTab === 'options'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Options ({item.options.length})
              </button>
            </nav>
          </div>

          {/* Basic Info Tab */}
          {currentTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => onChange({...item, name: e.target.value})}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={item.description}
                  onChange={(e) => onChange({...item, description: e.target.value})}
                  rows={3}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Price (KRW)</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => onChange({...item, price: Number(e.target.value)})}
                  className="input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={item.category}
                  onChange={(e) => onChange({...item, category: e.target.value})}
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
          )}

          {/* Options Tab */}
          {currentTab === 'options' && (
            <div className="space-y-6">
              {item.options.map((option, optionIndex) => (
                <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Option Name</label>
                        <input
                          type="text"
                          value={option.name}
                          onChange={(e) => updateOption(optionIndex, { name: e.target.value })}
                          placeholder="e.g., Size, Spice Level"
                          className="input"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`new-required-${optionIndex}`}
                          checked={option.required}
                          onChange={(e) => updateOption(optionIndex, { required: e.target.checked })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`new-required-${optionIndex}`} className="ml-2 block text-sm text-gray-900">
                          Required option
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => removeOption(optionIndex)}
                      className="ml-4 p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Choices */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-medium text-gray-900">Choices</h4>
                      <button
                        onClick={() => addChoice(optionIndex)}
                        className="btn-secondary text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Choice
                      </button>
                    </div>
                    
                    {option.choices.map((choice, choiceIndex) => (
                      <div key={choice.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={choice.name}
                            onChange={(e) => updateChoice(optionIndex, choiceIndex, { name: e.target.value })}
                            placeholder="Choice name"
                            className="input text-sm"
                          />
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            value={choice.priceModifier}
                            onChange={(e) => updateChoice(optionIndex, choiceIndex, { priceModifier: Number(e.target.value) })}
                            placeholder="Price modifier"
                            className="input text-sm"
                          />
                        </div>
                        <div className="text-xs text-gray-500 w-16">
                          {choice.priceModifier !== 0 && (
                            <span className={choice.priceModifier > 0 ? 'text-orange-600' : 'text-green-600'}>
                              {choice.priceModifier > 0 ? '+' : ''}{formatCurrency(choice.priceModifier)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeChoice(optionIndex, choiceIndex)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {option.choices.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No choices added yet</p>
                    )}
                  </div>
                </div>
              ))}
              
              {item.options.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-3">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No options yet</h3>
                    <p className="text-gray-500 mb-4">Add options like size, spice level, or toppings</p>
                    <button
                      onClick={addOption}
                      className="btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Option
                    </button>
                  </div>
                </div>
              )}

              {/* Add Option Button - only show when options already exist */}
              {item.options.length > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={addOption}
                    className="btn-secondary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Option
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="btn-primary"
              disabled={isLoading || !item.name || !item.description || item.price <= 0}
            >
              {isLoading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};