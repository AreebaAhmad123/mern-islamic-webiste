import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Loader from '../components/loader.component';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch categories from the server
    axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/categories`)
      .then(({ data }) => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching categories:', err);
        // Fallback to default categories if API fails
        setCategories([
          { name: 'Islamic History', count: 0, description: 'Stories from Islamic history and tradition' },
          { name: 'Prophet Stories', count: 0, description: 'Narratives about the Prophet Muhammad (PBUH) and other prophets' },
          { name: 'Contemporary', count: 0, description: 'Modern Muslim experiences and reflections' },
          { name: 'Spiritual', count: 0, description: 'Spiritual insights and guidance' },
          { name: 'Community', count: 0, description: 'Stories about Muslim communities around the world' },
          { name: 'Education', count: 0, description: 'Educational content about Islam and Muslim culture' }
        ]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Categories</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <Link 
            key={index}
            to={`/category/${encodeURIComponent(category.name)}`}
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{category.name}</h2>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {category.count || 0} stories
              </span>
            </div>
            <p className="text-gray-600">{category.description}</p>
          </Link>
        ))}
      </div>
      
      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No categories available at the moment.</p>
          <p className="text-gray-400 mt-2">Check back soon for new content!</p>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage; 