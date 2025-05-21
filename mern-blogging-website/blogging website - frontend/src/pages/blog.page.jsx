import axios from "axios";
import { useEffect, useState, createContext } from "react";
import { useParams, Link } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import getDay from "../common/date";
import BlogInteraction from "../components/blog-interaction.component";
import BlogPostCard from "../components/blog-post.component";
import BlogContent from "../components/blog-content.component";
export const BlogContext = createContext({});

export const blogStructure = {
    title: "",
    des: "",
    content: [],

    author: { personal_info: {} },
    banner: "",
    publishedAt: "",
};


const BlogPage = () => {
    const { blog_id } = useParams();

    const [blog, setBlog] = useState(blogStructure);
    const [similarBlogs, setSimilarBlogs] = useState(null); // Fixed variable name
    const [loading, setLoading] = useState(true);
    const [isLikedByUser, setLikedByUser] = useState(false);

    const {
        title,
        content,
        banner,
        author: {
            personal_info: { fullname, username: author_username, profile_img },
        },
        publishedAt,
    } = blog;
    useEffect(() => {
        const loadBlogData = async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/blog/${blog_id}`);
                setBlog(data.blog);
    
                // Check if user already liked this blog
                if (data.likedByUser) {
                    setLikedByUser(true);
                }
            } catch (err) {
                console.error("Error loading blog:", err);
            }
        };
    
        loadBlogData();
    }, [blog_id]);

    const fetchBlog = () => {
        axios
            .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog", { blog_id })
            .then(({ data: { blog } }) => {
                setBlog(blog);
                axios
                    .post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
                        tag: blog.tags[0],
                        limit: 6,
                        eleminate_blog: blog_id,
                    })
                    .then(({ data }) => {
                        setSimilarBlogs(data.blogs);
                    })
                    .catch(err => {
                        console.error("Error fetching similar blogs:", err);
                        setSimilarBlogs([]); // Set to empty array instead of null if error occurs
                    });

                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        resetStates();
        fetchBlog();
    }, [blog_id]);

    const resetStates = () => {
        setBlog(blogStructure);
        setSimilarBlogs(null);
        setLoading(true); // Should be true when resetting
    };

    return (
        <AnimationWrapper>
            {loading ? (
                <Loader />
            ) : (
                <BlogContext.Provider value={{ blog, setBlog, isLikedByUser, setLikedByUser }}>
                    <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
                        <img src={banner} alt="Blog Banner" className="aspect-video" />

                        <div className="mt-12">
                            <h2>{title}</h2>

                            <div className="flex max-sm:flex-col justify-between my-8">
                                <div className="flex gap-5 items-start">
                                    <img
                                        src={profile_img}
                                        alt="Author"
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <p className="capitalize">
                                        {fullname}
                                        <br />
                                        <Link
                                            to={`/user/${author_username}`}
                                            className="underline"
                                        >
                                            @{author_username}
                                        </Link>
                                    </p>
                                </div>

                                <div>
                                    <p className="text-dark-grey opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5">
                                        Published on {getDay(publishedAt)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <BlogInteraction />
                        <div className="my-12 font-geliasio blog-page-content">
                            {content[0].blocks.map((block, i) => (
                                <div key={i} className="my-4 md:my-8">
                                    <BlogContent block={block} />
                                </div>
                            ))}
                        </div>

                        <BlogInteraction />

                        {similarBlogs && similarBlogs.length ? (
                            <>
                                <h1 className="text-2xl mt-14 mb-10 font-medium">Similar Blogs</h1>
                                {similarBlogs.map((blog, i) => {
                                    let { author: { personal_info } } = blog;

                                    return (
                                        <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                            <BlogPostCard content={blog} author={personal_info} />
                                        </AnimationWrapper>
                                    );
                                })}
                            </>
                        ) : null}

                        <BlogInteraction />
                    </div>
                </BlogContext.Provider>
            )}
        </AnimationWrapper>
    );
};

export default BlogPage;