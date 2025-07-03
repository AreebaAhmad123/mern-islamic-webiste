import React, { useContext } from "react";
import { Link } from "react-router-dom";
import getDay, { getFullDay } from "../common/date";
import { BlogContext } from "../pages/blog.page";
import { UserContext } from "../App";
import axios from "../common/axios-config";
import { updateUserAuth } from "../common/auth";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Sidebar = ({ author, tags, topPosts, blogId }) => {
  const { setCommentsWrapper } = useContext(BlogContext) || {};
  const { userAuth, setUserAuth } = useContext(UserContext) || {};
  const [bookmarking, setBookmarking] = React.useState(false);

  // Check if this blog is bookmarked
  const isBookmarked = userAuth?.bookmarked_blogs?.includes(blogId);

  const handleCommentClick = () => {
    if (setCommentsWrapper) setCommentsWrapper(true);
    const el = document.getElementById("comments-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleBookmark = async () => {
    if (!userAuth?.access_token || bookmarking || !blogId) return;
    setBookmarking(true);
    try {
      const url = isBookmarked ? "/unbookmark-blog" : "/bookmark-blog";
      await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/api" + url,
        { blog_id: blogId },
        { headers: { Authorization: `Bearer ${userAuth.access_token}` } }
      );
      // Fetch latest user profile and update userAuth
      const { data: user } = await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/api/get-profile",
        { username: userAuth.username }
      );
      updateUserAuth({ ...user, access_token: userAuth.access_token }, setUserAuth);
    } catch (err) {
      toast.error("Failed to update bookmark. Please try again.");
      console.error("Bookmark error:", err);
    } finally {
      setTimeout(() => setBookmarking(false), 300);
    }
  };

  const handleShare = async () => {
    if (!blogId) return;
    const url = window.location.origin + "/blog/" + blogId;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Blog link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  return (
    <aside className="w-full max-w-xs flex flex-col gap-6">
      {/* Action Buttons */}
      <div className="flex gap-3 mb-2">
        <button
          className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-gray-700 font-medium text-sm"
          onClick={handleShare}
          disabled={!blogId}
        >
          <i className="fi fi-rs-paper-plane"></i> Share
        </button>
        {blogId && (
          <button
            className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-gray-700 font-medium text-sm"
            onClick={handleBookmark}
            disabled={bookmarking}
            aria-label={isBookmarked ? "Unbookmark" : "Bookmark"}
          >
            {isBookmarked ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" /></svg>
            )}
            Marking
          </button>
        )}
        <button
          className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 flex items-center justify-center gap-2 text-gray-700 font-medium text-sm"
          onClick={handleCommentClick}
        >
          <i className="fi fi-rs-comment-dots"></i> Comment
        </button>
      </div>
      {/* Author Info */}
      <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
        <img
                          src={author?.personal_info?.profile_img || author?.profile_img || '/src/imgs/user profile.png'}
          alt={author?.fullname}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{author?.fullname}</h3>
          <div className="text-xs text-gray-400 mb-1">@{author?.personal_info?.username || author?.username}</div>
          <span className="text-xs text-gray-500">{author?.total_posts || 0} post{author?.total_posts === 1 ? '' : 's'}</span>
        </div>
      </div>
      {/* Tags */}
      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-yellow-400 text-lg">•</span> Tags
        </h4>
        <div className="flex flex-wrap gap-2">
          {tags?.map((tag, idx) => (
            <Link
              to={`/search/${encodeURIComponent(tag)}`}
              key={idx}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs cursor-pointer hover:bg-yellow-100 sidebar-tag-link"
              style={{ textDecoration: 'none' }}
            >
              {tag}
            </Link>
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
              to={`/blog/${post.blog_id}`}
              key={post.blog_id}
              className="flex gap-3 items-center hover:bg-gray-50 rounded-lg p-2 transition sidebar-top-post-link"
            >
              <img
                src={post.banner}
                alt={post.title}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1">
                <div className="font-medium text-sm line-clamp-2">{post.title}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{new Date(post.publishedAt).toLocaleString('default', { month: 'short', year: 'numeric' })}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 