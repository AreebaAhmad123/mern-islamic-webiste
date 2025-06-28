import React from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ author, tags, topPosts }) => {
  return (
    <aside className="w-full max-w-xs flex flex-col gap-6">
      {/* Action Buttons */}
      <div className="flex gap-3 mb-2">
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-gray-700 font-medium text-sm">
          <i className="fi fi-rs-paper-plane"></i> Share
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-gray-700 font-medium text-sm">
          <i className="fi fi-rr-bookmark"></i> Marking
        </button>
        <button className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-gray-700 font-medium text-sm">
          <i className="fi fi-rs-comment-dots"></i> Comment
        </button>
      </div>
      {/* Author Info */}
      <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
        <img
          src={author?.profile_img}
          alt={author?.fullname}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{author?.fullname}</h3>
          <span className="text-xs text-gray-500">{author?.postCount || 0} post{author?.postCount === 1 ? '' : 's'}</span>
        </div>
      </div>
      {/* Tags */}
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-yellow-400 text-lg">•</span> Tags
        </h4>
        <div className="flex flex-wrap gap-2">
          {tags?.map((tag, idx) => (
            <span
              key={idx}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-yellow-100"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      {/* Top Posts */}
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-yellow-400 text-lg">•</span> Top Post
        </h4>
        <div className="flex flex-col gap-3">
          {topPosts?.map((post, idx) => (
            <Link
              to={`/blog/${post._id}`}
              key={post._id}
              className="flex gap-3 items-center hover:bg-gray-50 rounded-lg p-2 transition"
            >
              <img
                src={post.banner}
                alt={post.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1">
                <div className="font-medium text-sm line-clamp-2">{post.title}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{post.subhead || 'Subhead'}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 