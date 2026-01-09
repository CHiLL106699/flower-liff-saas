/**
 * LIFF 醫美商城頁面
 * 
 * 顯示可購買的產品與療程
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Truck,
  Search,
  ShoppingCart,
  Star,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/input';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_active: boolean;
}

export default function LiffMall() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getOrganizationId = () => {
    return parseInt(import.meta.env.VITE_ORGANIZATION_ID || '1');
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // 從 treatments 表載入可購買的療程/產品
        const { data, error } = await supabase
          .from('treatments')
          .select('*')
          .eq('organization_id', getOrganizationId())
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        
        // 將 treatments 轉換為產品格式
        const productList = (data || []).map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || '專業醫美療程',
          price: t.price,
          category: t.category || '療程',
          image_url: t.image_url,
          is_active: t.is_active
        }));
        
        setProducts(productList);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  // 獲取所有分類
  const categories = ['all', ...new Set(products.map(p => p.category))];

  // 過濾產品
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product: Product) => {
    // 導向預約頁面並帶入療程 ID
    navigate(`/booking?treatment=${product.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6" />
              <h1 className="text-xl font-bold">醫美商城</h1>
            </div>
          </div>
          <button className="p-2 hover:bg-white/20 rounded-full transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>

        {/* 搜尋欄 */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="搜尋產品或療程..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 border-0"
          />
        </div>
      </div>

      {/* 分類標籤 */}
      <div className="px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {category === 'all' ? '全部' : category}
            </button>
          ))}
        </div>
      </div>

      {/* 產品列表 */}
      <div className="px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery ? '找不到符合的產品' : '目前沒有可購買的產品'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden text-left hover:shadow-md transition-shadow active:scale-98"
              >
                {/* 產品圖片 */}
                <div className="aspect-square bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Truck className="w-12 h-12 text-emerald-300" />
                  )}
                </div>

                {/* 產品資訊 */}
                <div className="p-3">
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {product.category}
                  </span>
                  <h3 className="font-medium text-slate-800 mt-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-emerald-600">
                      ${product.price.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-xs">4.8</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 pb-8">
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
          <p className="text-sm text-emerald-700 text-center">
            💡 點擊產品可直接預約療程
          </p>
        </div>
      </div>
    </div>
  );
}
