import { useState, useEffect } from "react";
import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import BlogPostCard from "./blog-post.component";
import Loader from "./loader.component";

const SimilarBlogs = ({ currentBlogId, tags }) => {
    const [similarBlogs, setSimilarBlogs] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimilarBlogs = async () => {
            if (!tags || tags.length === 0) {
                setSimilarBlogs([]);
                setLoading(false);
                return;
            }

            try {
                const { data } = await axios.post(
                    `${import.meta.env.VITE_SERVER_DOMAIN}/search-blogs`,
                    {
                        tag: tags[0],
                        limit: 6,
                        eleminate_blog: currentBlogId
                    }
                );
                setSimilarBlogs(data.blogs);
            } catch (err) {
                console.error("Error fetching similar blogs:", err);
                setSimilarBlogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSimilarBlogs();
    }, [currentBlogId, tags]);

    if (loading) {
        return <Loader />;
    }

    if (!similarBlogs || similarBlogs.length === 0) {
        return null;
    }

    return (
        <div className="mt-14">
            <h1 className="text-2xl mb-10 font-medium">Similar Blogs</h1>
            {similarBlogs.map((blog, i) => {
                let { author: { personal_info } } = blog;
                return (
                    <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                        <BlogPostCard content={blog} author={personal_info} />
                    </AnimationWrapper>
                );
            })}
        </div>
    );
};

export default SimilarBlogs; 