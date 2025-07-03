import getDay from "../common/date";
import { Link } from "react-router-dom";
import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { UserContext } from "../App";
import { toast } from "react-toastify";
import { updateUserAuth } from "../common/auth";

const BlogPostCard = ({ content, author, liked, onLikeToggle }) => {

    let { publishedAt, tags, title, des, banner, activity: { total_likes }, blog_id: id } = content;
    let { fullname, profile_img, username } = author;
    const [loading, setLoading] = useState(false);
    const [bookmarking, setBookmarking] = useState(false);
    const { userAuth, setUserAuth } = useContext(UserContext);

    // Local state for likes and liked status
    const [likes, setLikes] = useState(total_likes);
    const [isLiked, setIsLiked] = useState(liked);

    // Check if this post is bookmarked
    const isBookmarked = userAuth?.bookmarked_blogs?.includes(id);

    // Keep local state in sync with props
    useEffect(() => {
        setIsLiked(liked);
    }, [liked]);
    useEffect(() => {
        setLikes(total_likes);
    }, [total_likes]);

    const handleLike = async (e) => {
        e.preventDefault(); // Prevent navigation
        if (loading || !userAuth?.access_token) return;

        setLoading(true);
        // Optimistically update UI
        setIsLiked(prev => !prev);
        setLikes(prev => prev + (isLiked ? -1 : 1));

        try {
            const { data } = await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/api/like-blog",
                { blog_id: id },
                {
                    headers: {
                        'Authorization': `Bearer ${userAuth.access_token}`
                    }
                }
            );
            if (onLikeToggle) onLikeToggle(data.liked, id);
        } catch (err) {
            // Revert on error
            setIsLiked(prev => !prev);
            setLikes(prev => prev + (isLiked ? 1 : -1));
        } finally {
            setLoading(false);
        }
    };

    // Handle bookmark/unbookmark with debouncing
    const handleBookmark = async (e) => {
        e.preventDefault();
        if (!userAuth?.access_token || bookmarking) return;
        
        // Prevent rapid clicks
        setBookmarking(true);
        
        try {
            const blog_id = id;
            const url = isBookmarked ? "/unbookmark-blog" : "/bookmark-blog";
            await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/api" + url,
                { blog_id },
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
            // Add a small delay to prevent rapid clicks
            setTimeout(() => {
                setBookmarking(false);
            }, 300);
        }
    };

    return (
        <Link to={`/blog/${id}`} className="block border-b border-grey pb-5 mb-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-stretch">
                {/* Image on top for mobile, left/right for desktop */}
                <div className="w-full h-40 sm:w-36 sm:h-28 flex-shrink-0 bg-grey rounded-md overflow-hidden">
                    <img src={banner} className="w-full h-full object-cover" />
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex gap-2 items-center mb-4">
                            <img src={profile_img || '/src/imgs/user profile.png'} className="w-6 h-6 rounded-full" alt={fullname} />
                            <p className="line-clamp-1">{fullname} @{username}</p>
                            <p className="min-w-fit">{getDay(publishedAt)}</p>
                        </div>
                        <h1 className="blog-title">{title}</h1>
                        <p className="my-3 text-base sm:text-xl font-gelasio leading-7 line-clamp-2">{des}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-4 items-center">
                        <span className="btn-light py-1 px-4">{tags[0]}</span>
                        <button 
                            onClick={handleLike}
                            disabled={loading}
                            className={`flex items-center gap-2 text-dark-grey ${isLiked ? 'text-red-500' : ''} hover:text-red-500 transition-colors`}
                        >
                            <i className={`fi ${isLiked ? 'fi-sr-heart' : 'fi-rr-heart'} text-xl`}></i>
                            {likes}
                        </button>
                        {/* Bookmark Button */}
                        <button 
                            onClick={handleBookmark}
                            disabled={bookmarking}
                            className={`flex items-center gap-2 text-dark-grey ${isBookmarked ? 'text-yellow-500' : ''} hover:text-yellow-500 transition-colors`}
                            aria-label={isBookmarked ? "Unbookmark" : "Bookmark"}
                        >
                            <i className={`fi ${isBookmarked ? 'fi-sr-bookmark' : 'fi-rr-bookmark'} text-xl`}></i>
                        </button>
                        {/* Views and Comments */}
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                            <i className="fi fi-rr-eye"></i> {content.activity?.total_reads || 0} Views
                        </span>
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                            <i className="fi fi-rr-comment-dots"></i> {content.activity?.total_comments || 0} Comments
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    )
};

export default BlogPostCard;