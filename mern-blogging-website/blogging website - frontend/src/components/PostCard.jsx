import React, { useState } from "react";
import { Link } from "react-router-dom";

const PostCard = ({ post }) => {
  const [imageError, setImageError] = useState(false);
  const defaultBanner = "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80";

  return (
    <Link to={`/blog/${post.blog_id || post._id}`} className="block">
      <div className="flex flex-col bg-white rounded-lg shadow-md p-4 h-[340px] max-w-xs w-full hover:shadow-lg transition-shadow duration-300 cursor-pointer">
        <img
          src={imageError ? defaultBanner : (post.banner || defaultBanner)}
          alt={post.title}
          className="rounded-md w-full h-32 object-cover mb-3"
          onError={() => setImageError(true)}
        />
        <h3 className="font-semibold text-base mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{post.description}</p>
        <div className="flex items-center mt-auto">
          {post.author && post.author.avatar && (
            <img
              src={post.author.avatar}
              alt={post.author.name || "Author"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="ml-2">
            <div className="text-sm font-medium">{post.author?.name || "Unknown Author"}</div>
            <div className="text-xs text-gray-400">
              {post.date ? new Date(post.date).toLocaleDateString() : "No date"}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PostCard; 