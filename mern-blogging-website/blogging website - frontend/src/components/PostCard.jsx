import React, { useState, useContext } from "react";
import { Link } from "react-router-dom";
import { getFullDay } from "../common/date";
import { UserContext } from "../App";
import axios from "../common/axios-config";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { updateUserAuth } from "../common/auth";

const PostCard = ({ post }) => {
  const [imageError, setImageError] = useState(false);
  const defaultBanner = "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80";
  const { userAuth, setUserAuth } = useContext(UserContext);
  const [bookmarking, setBookmarking] = useState(false);

  // Check if this post is bookmarked
  const isBookmarked = userAuth?.bookmarked_blogs?.includes(post.blog_id);

  // Handle bookmark/unbookmark with debouncing
  const handleBookmark = async (e) => {
    e.preventDefault();
    if (!userAuth?.access_token || bookmarking) return;
    
    // Prevent rapid clicks
    setBookmarking(true);
    
    try {
      const blog_id = post.blog_id;
      const url = isBookmarked ? "/unbookmark-blog" : "/bookmark-blog";
      await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + url,
        { blog_id },
        { headers: { Authorization: `Bearer ${userAuth.access_token}` } }
      );
      // Fetch latest user profile and update userAuth
      const { data: user } = await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/get-profile",
        { username: userAuth.username }
      );
      updateUserAuth({ ...user, access_token: userAuth.access_token }, setUserAuth);
    } catch (err) {
      toast.error("Failed to update bookmark. Please try again.");
      console.error("Bookmark error:", err);
    } finally {
      // Add a small delay to prevent rapid clicks
      setTimeout(() => {
        setBookmarking(false);
      }, 300);
    }
  };

  return (
    <>
      <Link to={`/blog/${post.blog_id || post._id}`} className="block w-full max-w-full">
        <div className="flex flex-col bg-white rounded-lg shadow-md p-4 h-[340px] w-full max-w-full hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden">
          <img
            src={imageError ? defaultBanner : (post.banner || defaultBanner)}
            alt={post.title}
            className="rounded-md w-full h-32 object-cover mb-3"
            onError={() => setImageError(true)}
          />
          <h3 className="font-semibold text-base mb-1 line-clamp-2">{post.title}</h3>
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">{post.description}</p>
          <div className="flex items-center mt-auto bg-gray-100 rounded-xl px-3 w-full">
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
                  onClick={handleBookmark}
                  aria-label={isBookmarked ? "Unbookmark" : "Bookmark"}
                  disabled={bookmarking}
              >
                  {isBookmarked ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" /></svg>
                  )}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </>
  );
};

export default PostCard; 