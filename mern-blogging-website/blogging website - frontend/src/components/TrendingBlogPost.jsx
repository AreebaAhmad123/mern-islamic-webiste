import { Link } from "react-router-dom";

const TrendingBlogPost = ({ blog, className }) => {
    if (!blog) {
        return null;
    }

    const { title, des, banner, blog_id } = blog;

    return (
        <Link to={`/blog/${blog_id}`} className={`relative w-full h-full rounded-lg overflow-hidden group block ${className}`}>
            <img
                src={banner}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-sm">
                <h3 className="text-xs font-normal text-black" style={{ fontSize: '10px' }}>{title}</h3>
                <p className="text-gray-800 mt-1 line-clamp-2 text-sm">{des}</p>
            </div>
        </Link>
    );
};

export default TrendingBlogPost; 