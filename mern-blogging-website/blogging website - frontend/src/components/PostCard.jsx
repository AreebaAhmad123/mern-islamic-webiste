import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getFullDay } from "../common/date";

const PostCard = ({ post }) => {
  const [imageError, setImageError] = useState(false);
  const defaultBanner = "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80";

  return (
    <Link to={`/blog/${post.blog_id || post._id}`} className="block">
      <div className="flex flex-col bg-white rounded-lg shadow-md p-4 h-[340px] max-w-xs w-full hover:shadow-lg transition-shadow duration-300 cursor-pointer ">
        <img
          src={imageError ? defaultBanner : (post.banner || defaultBanner)}
          alt={post.title}
          className="rounded-md w-full h-32 object-cover mb-3"
          onError={() => setImageError(true)}
        />
        <h3 className="font-semibold text-base mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{post.description}</p>
        <div className="flex items-center mt-auto bg-gray-100 rounded-xl px-3 ">
          {post.author && post.author.avatar && (
            <img
              src={post.author.avatar}
              alt={post.author.name || "Author"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="ml-2 flex-grow flex items-center justify-between">
            <div>
                <div className="text-sm font-medium ">{post.author?.name || "Unknown Author"}</div>
                <div className="text-xs text-gray-400">
                {post.date ? getFullDay(post.date) : "No date"}
                </div>
            </div>
            <button 
                onClick={(e) => e.preventDefault()}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-400 hover:text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PostCard; 