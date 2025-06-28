import { Link } from "react-router-dom";
import getDay from "../common/date";
import Loader from "./loader.component";
import NoDataMessage from "./nodata.component";

const SimilarBlogCard = ({ blog }) => {
    const { title, des, banner, blog_id: id, author: { personal_info: { fullname, username, profile_img } }, publishedAt } = blog;

    return (
        <Link to={`/blog/${id}`} className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="relative h-48 w-full">
                <img 
                    src={banner} 
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.src = "/imgs/blog banner.png";
                    }}
                />
            </div>
            <div className="p-4 flex-grow">
                <div className="flex items-center gap-2 mb-3">
                    <img src={profile_img} className="w-6 h-6 rounded-full" alt={fullname} />
                    <p className="text-sm text-gray-600 line-clamp-1">{fullname} @{username}</p>
                    <p className="text-sm text-gray-500 ml-auto">{getDay(publishedAt)}</p>
                </div>
                <h3 className="text-lg font-semibold mb-2 line-clamp-2">{title}</h3>
                <p className="text-gray-600 text-sm line-clamp-3">{des}</p>
            </div>
        </Link>
    );
};

const SimilarBlogs = ({ blogs, loading }) => {
    if (loading) {
        return <Loader />;
    }

    if (!blogs || blogs.length === 0) {
        return <NoDataMessage message="No similar blogs found" />;
    }

    return (
        <div className="mt-14">
            <h2 className="text-2xl font-semibold mb-8">Similar Blogs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map((blog, i) => (
                    <SimilarBlogCard key={blog.blog_id} blog={blog} />
                ))}
            </div>
        </div>
    );
};

export default SimilarBlogs; 