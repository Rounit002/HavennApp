import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState({ name: '' });
  const [editingProduct, setEditingProduct] = useState<{ id: number; name: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const handleBarcodeClick = () => {};

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await api.getProducts();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editingProduct) {
        const updatedProduct = await api.updateProduct(editingProduct.id, formData);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        setEditingProduct(null);
      } else {
        const newProduct = await api.addProduct(formData);
        setProducts(prev => [...prev, newProduct]);
        setFormData({ name: '' });
      }
      toast.success('Product saved successfully');
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleEdit = (product: { id: number; name: string }) => {
    setEditingProduct(product);
    setFormData({ name: product.name });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} onBarcodeClick={handleBarcodeClick} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Products</h1>
              <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 dark:from-indigo-600 dark:via-fuchsia-600 dark:to-sky-600 shadow-sm ring-1 ring-white/30" />
            </div>

            {/* Create/Edit form */}
            <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 ring-1 ring-indigo-100/70 dark:ring-indigo-900/40 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Product Name"
                  className="w-full sm:w-auto flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white/95 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm"
                />
                <button onClick={handleSubmit} className="px-4 py-2 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-sky-500 text-white rounded-md shadow-md hover:from-violet-500 hover:via-fuchsia-400 hover:to-sky-400 focus:ring-2 focus:ring-violet-300 ring-1 ring-white/20">
                  {editingProduct ? 'Update' : 'Add'} Product
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 via-fuchsia-50 to-sky-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-200">Name</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 sm:px-6 py-3 text-gray-800 dark:text-gray-100">{product.name}</td>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex gap-3">
                          <button onClick={() => handleEdit(product)} className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">Edit</button>
                          <button onClick={() => handleDelete(product.id)} className="px-2 py-1 text-xs rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;