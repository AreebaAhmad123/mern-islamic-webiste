import getDay from "../common/date";
import { Link } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

const BlogPostCard = ({ content, author, liked, onLikeToggle }) => {

    let { publishedAt, tags, title, des, banner, activity: { total_likes }, blog_id: id } = content;
    let { fullname, profile_img, username } = author;
    const [loading, setLoading] = useState(false);

    const handleLike = async (e) => {
        e.preventDefault(); // Prevent navigation
        if (loading) return;
        
        setLoading(true);
        try {
            const { data } = await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/like-blog",
                { blog_id: id }
            );
            // Assume API returns { liked_blogs: [...] }
            if (onLikeToggle) onLikeToggle(data.liked_blogs);
        } catch (err) {
            console.error("Failed to like blog", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Link to={`/blog/${id}`} className="flex gap-8 items-center border-b border-grey pb-5 mb-4">
            <div className="w-full">
                <div className="flex gap-2 items-center mb-7">
                    <img src={profile_img} className="w-6 h-6 rounded-full" />
                    <p className="line-clamp-1">{fullname} @{username}</p>
                    <p className="min-w-fit">{getDay(publishedAt)}</p>
                </div>

                <h1 className="blog-title">{title}</h1>

                <p className="my-3 text-xl font-gelasio leading-7 max-sm:hidden md:max-[1100px]:hidden line-clamp-2">{des}</p>

                <div className="flex gap-4 mt-7">
                    <span className="btn-light py-1 px-4">{tags[0]}</span>
                    <button 
                        onClick={handleLike}
                        disabled={loading}
                        className={`ml-3 flex items-center gap-2 text-dark-grey ${liked ? 'text-red-500' : ''} hover:text-red-500 transition-colors`}
                    >
                        <i className={`fi ${liked ? 'fi-sr-heart' : 'fi-rr-heart'} text-xl`}></i>
                        {total_likes}
                    </button>
                </div>

            </div>

            <div className="h-28 aspect-square bg-grey">
                <img src={banner} className="w-full h-full aspect-square object-cover" />
            </div>

        </Link>
    )
};

export default BlogPostCard;