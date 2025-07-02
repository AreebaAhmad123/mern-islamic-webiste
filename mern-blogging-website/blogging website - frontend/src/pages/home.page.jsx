import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import { useState, useEffect, useContext, useCallback, useMemo } from "react";
import Loader from "../components/loader.component";
import BlogPostCard from "../components/blog-post.component";
import MinimalBlogPost from "../components/nobanner-blog-post.component";
import { activeTabLineRef } from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component"
import LoadMoreDataBtn from "../components/load-more.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import axios from "axios";
import { UserContext, FooterContext } from "../App";
import CategorySlider from "../components/category-slider.component";
import TrendingBlogPost from "../components/TrendingBlogPost";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import getDay from "../common/date";
import PostCard from "../components/PostCard.jsx";
import { Link } from "react-router-dom";
import getFullDay from "../common/date";
import { updateUserAuth } from "../common/auth";

const HomePage = () => {
    let [blogs, setBlog] = useState(null);
    let [trendingblogs, setTrendingBlog] = useState(null);
    let [pageState, setPageState] = useState("home");
    const { userAuth, setUserAuth } = useContext(UserContext);
    const { setBlogImages, setCategories } = useContext(FooterContext);
    const liked_blogs = userAuth?.liked_blogs || [];
    const bookmarked_blogs = userAuth?.bookmarked_blogs || [];
    const [bookmarking, setBookmarking] = useState(false);

    // Pagination state for each section
    const [popularPage, setPopularPage] = useState(1);
    const [newPage, setNewPage] = useState(1);
    const [trendyPage, setTrendyPage] = useState(1);
    const [topPage, setTopPage] = useState(1);
    const [popularBlogs, setPopularBlogs] = useState([]);
    const [newBlogs, setNewBlogs] = useState([]);
    const [trendyBlogs, setTrendyBlogs] = useState([]);
    const [topBlogs, setTopBlogs] = useState([]);
    
    // Loading states for slider transitions
    const [popularLoading, setPopularLoading] = useState(false);
    const [newLoading, setNewLoading] = useState(false);
    const [trendyLoading, setTrendyLoading] = useState(false);
    const [topLoading, setTopLoading] = useState(false);

    // Store all fetched blogs to avoid re-fetching
    const [allPopularBlogs, setAllPopularBlogs] = useState([]);
    const [allNewBlogs, setAllNewBlogs] = useState([]);
    const [allTrendyBlogs, setAllTrendyBlogs] = useState([]);
    const [allTopBlogs, setAllTopBlogs] = useState([]);

    const baseCategories = ["islam", "prophets", "religion", "basics", "sahaba", "anbiya"];
    
    // Memoize categories calculation to prevent infinite re-renders
    const categories = useMemo(() => {
        const tagCategories = (blogs?.results || []).flatMap(blog => blog.tags || []);
        return Array.from(new Set([...baseCategories, ...tagCategories]));
    }, [blogs?.results]);

    // Update categories and blog images for footer
    useEffect(() => {
        if (setCategories) {
            setCategories(categories);
        }
        
        // Collect blog images for footer
        const allBlogs = [
            ...(blogs?.results || []),
            ...(trendingblogs || []),
            ...popularBlogs,
            ...newBlogs,
            ...trendyBlogs,
            ...topBlogs
        ];
        // Store blog objects (with banner and blog_id) for Instagram section
        const blogObjs = allBlogs
            .filter(blog => blog.banner && blog.blog_id)
            .slice(0, 12);
        if (setBlogImages) {
            setBlogImages(blogObjs);
        }
    }, [blogs, trendingblogs, popularBlogs, newBlogs, trendyBlogs, topBlogs, setCategories, setBlogImages]);

    let [mostViewedBlogs, setMostViewedBlogs] = useState([]);
    let [mostViewedPage, setMostViewedPage] = useState(1);
    let [mostViewedLoading, setMostViewedLoading] = useState(false);
    const MOST_VIEWED_LIMIT = 6;

    const fetchLatestBlogs = async (page = 1) => {
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page }, {
                timeout: 10000 // 10 second timeout
            });
            const formattedData = await filterPaginationData({
                state: blogs,
                data: data.blogs,
                page,
                countRoute: "/all-latest-blogs-count",
                create_new_arr: page === 1,
            });

            if (formattedData) {
                setBlog(formattedData);
            }
        } catch (err) {
            console.error("Error fetching latest blogs:", err);
            // Set a default state to prevent infinite loading
            setBlog(prev => prev || { results: [], page: 1, totalDocs: 0 });
        }
    }

    const fetchBlogsByCategory = async (page = 1) => {
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
                tag: pageState,
                page,
            }, {
                timeout: 10000 // 10 second timeout
            });

            const formattedData = await filterPaginationData({
                state: blogs,
                data: data.blogs,
                page,
                countRoute: "/search-blogs-count",
                create_new_arr: page === 1,
                data_to_send: { tag: pageState },
            });

            if (formattedData) {
                setBlog(formattedData);
            }
        } catch (err) {
            console.error("Error fetching category blogs:", err);
            // Set a default state to prevent infinite loading
            setBlog(prev => prev || { results: [], page: 1, totalDocs: 0 });
        }
    };

    const fetchTrendingBlogs = () => {
        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs", {
            timeout: 10000 // 10 second timeout
        })
            .then(({ data }) => {
                setTrendingBlog(data.blogs);
            })
            .catch(err => {
                console.error("Error fetching trending blogs:", err);
                setTrendingBlog([]); // Set empty array instead of null
            });
    };

    const handleCategorySelect = (category) => {
        const newCategory = category.toLowerCase();
        if (pageState === newCategory) {
            setPageState("home");
        } else {
            setPageState(newCategory);
        }
        setBlog(null);
    };

    // Fetch most viewed blogs (for New Posts section)
    const fetchMostViewedBlogs = async (page = 1) => {
        setMostViewedLoading(true);
        try {
            // If backend supports pagination, use it. Otherwise, fetch all and paginate client-side.
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs");
            if (page === 1) {
                setMostViewedBlogs(data.blogs.slice(0, MOST_VIEWED_LIMIT));
            } else {
                setMostViewedBlogs(prev => [
                    ...prev,
                    ...data.blogs.slice((page - 1) * MOST_VIEWED_LIMIT, page * MOST_VIEWED_LIMIT)
                ]);
            }
        } catch (err) {
            setMostViewedBlogs([]);
        } finally {
            setMostViewedLoading(false);
        }
    };

    // Fetch blogs for Popular section with pagination
    const fetchPopularBlogs = async (page = 1) => {
        setPopularLoading(true);
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page });
            // Sort by most views (total_reads)
            const sorted = data.blogs.sort((a, b) => (b.activity?.total_reads || 0) - (a.activity?.total_reads || 0));
            const startIndex = (page - 1) * 4;
            const endIndex = startIndex + 4;
            const newBlogs = sorted.slice(startIndex, endIndex);
            if (newBlogs.length === 0 && page > 1) {
                setPopularPage(1);
                fetchPopularBlogs(1);
            } else {
                setPopularBlogs(newBlogs);
            }
        } catch (err) {
            console.error("Error fetching popular blogs:", err);
            setPopularBlogs([]);
        } finally {
            setPopularLoading(false);
        }
    };

    // Fetch blogs for New section with pagination
    const fetchNewBlogs = async (page = 1) => {
        setNewLoading(true);
        try {
            // Use POST endpoint with pagination
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page });
            // Format the date for each blog before setting the state
            const formattedBlogs = data.blogs.map(blog => ({
                ...blog,
                date: getDay(blog.publishedAt) // Ensure date is formatted
            }));
            setNewBlogs(formattedBlogs);
        } catch (err) {
            console.error("Error fetching new blogs:", err);
            setNewBlogs([]); // Set empty array on error
        } finally {
            setNewLoading(false);
        }
    };

    // Fetch blogs for Trendy section with pagination
    const fetchTrendyBlogs = async (page = 1) => {
        setTrendyLoading(true);
        try {
            // Fetch new data for each page
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs");
            const startIndex = (page - 1) * 4;
            const endIndex = startIndex + 4;
            const newBlogs = data.blogs.slice(startIndex, endIndex);
            
            // Replace the displayed blogs (slider behavior)
            setTrendyBlogs(newBlogs);
        } catch (err) {
            console.error("Error fetching trendy blogs:", err);
            setTrendyBlogs([]); // Set empty array on error
        } finally {
            setTrendyLoading(false);
        }
    };

    // Fetch blogs for Top section with pagination
    const fetchTopBlogs = async (page = 1) => {
        setTopLoading(true);
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page });
            // Sort by most liked + most commented
            const sorted = data.blogs.sort((a, b) => {
                const aScore = (a.activity?.total_likes || 0) + (a.activity?.total_comments || 0);
                const bScore = (b.activity?.total_likes || 0) + (b.activity?.total_comments || 0);
                return bScore - aScore;
            });
            const startIndex = (page - 1) * 4;
            const endIndex = startIndex + 4;
            const newBlogs = sorted.slice(startIndex, endIndex);
            if (newBlogs.length === 0 && page > 1) {
                setTopPage(1);
                fetchTopBlogs(1);
            } else {
                setTopBlogs(newBlogs);
            }
        } catch (err) {
            console.error("Error fetching top blogs:", err);
            setTopBlogs([]);
        } finally {
            setTopLoading(false);
        }
    };

    const [maxPopularPage, setMaxPopularPage] = useState(1);
    const [maxTopPage, setMaxTopPage] = useState(1);

    useEffect(() => {
        const loadData = async () => {
            try {
                if (activeTabLineRef?.current) {
                    activeTabLineRef.current.click();
                }
                setBlog(null); // Reset to trigger loader
                
                if (pageState == "home") {
                    await fetchLatestBlogs(1);
                } else {
                    await fetchBlogsByCategory(1);
                }
                
                if (!trendingblogs) {
                    fetchTrendingBlogs();
                }
                
                if (mostViewedBlogs.length === 0) {
                    fetchMostViewedBlogs(1);
                }
                
                // Initialize section blogs only once
                if (popularBlogs.length === 0) {
                    fetchPopularBlogs(1);
                }
                if (newBlogs.length === 0) {
                    fetchNewBlogs(1);
                }
                if (trendyBlogs.length === 0) {
                    fetchTrendyBlogs(1);
                }
                if (topBlogs.length === 0) {
                    fetchTopBlogs(1);
                }
            } catch (error) {
                console.error("Error loading initial data:", error);
                // Set default states to prevent infinite loading
                setBlog({ results: [], page: 1, totalDocs: 0 });
                setTrendingBlog([]);
            }
        };

        loadData();
    }, [pageState]); // Removed liked_blogs from dependencies to prevent unnecessary re-fetches

    useEffect(() => {
        // Fetch total count for popular blogs on mount
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/all-latest-blogs-count")
            .then(({ data }) => {
                if (data.totalDocs) {
                    setMaxPopularPage(Math.ceil(data.totalDocs / 4));
                    setMaxTopPage(Math.ceil(data.totalDocs / 4));
                }
            })
            .catch(() => {
                setMaxPopularPage(1);
                setMaxTopPage(1);
            });
    }, []);

    const handleShowMoreMostViewed = () => {
        const nextPage = mostViewedPage + 1;
        setMostViewedPage(nextPage);
        fetchMostViewedBlogs(nextPage);
    };

    // Arrow navigation handlers
    const handlePopularNext = () => {
        if (popularPage < maxPopularPage) {
            const nextPage = popularPage + 1;
            setPopularPage(nextPage);
            fetchPopularBlogs(nextPage);
        }
    };

    const handlePopularPrev = () => {
        if (popularPage > 1) {
            const prevPage = popularPage - 1;
            setPopularPage(prevPage);
            fetchPopularBlogs(prevPage);
        }
    };

    const handleNewNext = () => {
        const nextPage = newPage + 1;
        setNewPage(nextPage);
        fetchNewBlogs(nextPage);
    };

    const handleNewPrev = () => {
        if (newPage > 1) {
            const prevPage = newPage - 1;
            setNewPage(prevPage);
            fetchNewBlogs(prevPage);
        }
    };

    const handleTrendyNext = () => {
        const nextPage = trendyPage + 1;
        setTrendyPage(nextPage);
        fetchTrendyBlogs(nextPage);
    };

    const handleTrendyPrev = () => {
        if (trendyPage > 1) {
            const prevPage = trendyPage - 1;
            setTrendyPage(prevPage);
            fetchTrendyBlogs(prevPage);
        }
    };

    const handleTopNext = () => {
        if (topPage < maxTopPage) {
            const nextPage = topPage + 1;
            setTopPage(nextPage);
            fetchTopBlogs(nextPage);
        }
    };

    const handleTopPrev = () => {
        if (topPage > 1) {
            const prevPage = topPage - 1;
            setTopPage(prevPage);
            fetchTopBlogs(prevPage);
        }
    };

    const loadBlogByCategory = (e) => {
        let category = e.target.innerText.toLowerCase();

        setBlog(null);

        if (pageState == category) {
            setPageState("home");
            return;
        }

        setPageState(category);
    }

    const handleLikeToggle = (liked, blog_id) => {
        // This function is called when a blog is liked/unliked
        // 'liked' is a boolean indicating the new like status
        // 'blog_id' is the ID of the blog being liked/unliked
        setUserAuth((prev) => {
            if (!prev) return prev;
            
            let liked_blogs = prev.liked_blogs || [];
            
            if (liked) {
                // Add blog to liked_blogs if not already present
                if (!liked_blogs.includes(blog_id)) {
                    liked_blogs = [...liked_blogs, blog_id];
                }
            } else {
                // Remove blog from liked_blogs
                liked_blogs = liked_blogs.filter(id => id !== blog_id);
            }
            
            return { ...prev, liked_blogs };
        });
    };

    // Handle bookmark/unbookmark with debouncing
    const handleBookmark = async (blog_id) => {
        if (!userAuth?.access_token || bookmarking) return;
        
        const isBookmarked = userAuth?.bookmarked_blogs?.includes(blog_id);
        setBookmarking(true);
        
        try {
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
            console.error("Bookmark error:", err);
        } finally {
            // Add a small delay to prevent rapid clicks
            setTimeout(() => {
                setBookmarking(false);
            }, 300);
        }
    };

    const loadMore = pageState === "home" ? fetchLatestBlogs : fetchBlogsByCategory;

    return (
        <AnimationWrapper>
            <CategorySlider categories={categories} onCategorySelect={handleCategorySelect} />
            <section className="h-cover flex flex-col gap-10 px-[5vw]">
                {/* Trending Blogs */}
                <div className="w-full">
                    <div className="flex items-center justify-between mb-8">
                        
                    </div>
                    {
                        trendingblogs == null ? (
                            <Loader />
                        ) : (
                            trendingblogs.length > 0 &&
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                {
                                    trendingblogs.slice(0, 2).map((blog, i) => (
                                        <div key={i} className="h-[300px]">
                                            <TrendingBlogPost blog={blog} />
                                        </div>
                                    ))
                                }
                                <div className="h-[300px] lg:col-span-2">
                                    <Swiper
                                        modules={[Navigation, Pagination, Autoplay]}
                                        spaceBetween={50}
                                        slidesPerView={1}
                                        navigation
                                        pagination={{ clickable: true }}
                                        autoplay={{
                                            delay: 3000,
                                            disableOnInteraction: false,
                                        }}
                                        loop={true}
                                        className="h-full"
                                    >
                                        {
                                            trendingblogs.slice(2).map((blog, i) => (
                                                <SwiperSlide key={i}>
                                                    <TrendingBlogPost blog={blog} />
                                                </SwiperSlide>
                                            ))
                                        }
                                    </Swiper>
                                </div>
                            </div>
                        )
                    }
                </div>

                {/* Popular Posts */}
                <div className="w-full">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-medium text-2xl">
                            Popular Posts
                        </h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handlePopularPrev}
                                disabled={popularPage === 1 || popularLoading}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handlePopularNext}
                                disabled={popularLoading || popularPage >= maxPopularPage}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {
                            popularLoading ? (
                                <div className="col-span-full flex justify-center py-8 ">
                                    <div className="flex items-center gap-2 ">
                                        <div className="w-6 h-6 border-2 border-gray-300 border-yellow-4600 rounded-full animate-spin "></div>
                                        <span className="text-gray-600">Loading blogs...</span>
                                    </div>
                                </div>
                            ) : popularBlogs.length === 0 ? (
                                <Loader />
                            ) : (
                                popularBlogs.length ?
                                    popularBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i}>
                                            <PostCard post={{
                                                banner: blog.banner,
                                                title: blog.title,
                                                description: blog.des || blog.description,
                                                author: {
                                                    name: blog.author?.personal_info?.fullname,
                                                    avatar: blog.author?.personal_info?.profile_img
                                                },
                                                date: blog.publishedAt || blog.createdAt,
                                                blog_id: blog.blog_id || blog._id
                                            }} />
                                        </AnimationWrapper>
                                    )) :
                                    <NoDataMessage message="No Blogs Published" />
                            )
                        }
                    </div>
                </div>

                {/* New Posts (Most Viewed) Section */}
                <div className="w-full mt-12">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-medium text-2xl">
                            New Posts
                        </h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleNewPrev}
                                disabled={newPage === 1 || newLoading}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNewNext}
                                disabled={newLoading}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {newLoading ? (
                            <div className="col-span-full flex justify-center py-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 border-2 border-gray-300 border-yellow-400 rounded-full animate-spin"></div>
                                    <span className="text-gray-600">Loading blogs...</span>
                                </div>
                            </div>
                        ) : newBlogs.length === 0 ? (
                            <Loader />
                        ) : newBlogs.length ? (
                            newBlogs.slice(0, 6).map((blog, i) => (
                                <Link 
                                    key={i}
                                    to={`/blog/${blog.blog_id || blog._id}`}
                                    className="block"
                                >
                                    <div
                                        className="flex flex-col sm:flex-row bg-white rounded-xl shadow p-4 gap-4 items-center hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                                    >
                                        {/* Blog Image */}
                                        <img
                                            src={blog.banner || "/src/imgs/default.jpg"}
                                            alt={blog.title}
                                            className="w-full sm:w-32 h-40 sm:h-32 object-cover rounded-lg"
                                        />
                                        {/* Blog Content */}
                                        <div className="flex-1 flex flex-col justify-between h-full">
                                            <div>
                                                <h2 className="font-semibold text-lg line-clamp-2">{blog.title}</h2>
                                                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{blog.des || blog.description}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-4 bg-gray-100 rounded-lg px-3 ">
                                                <div className="flex items-center gap-2 rounded-lg px-3 py-2">
                                                    <img
                                                        src={blog.author?.personal_info?.profile_img || "/src/imgs/default.jpg"}
                                                        alt={blog.author?.personal_info?.fullname}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{blog.author?.personal_info?.fullname}</span>
                                                        <span className="text-xs text-gray-500 mt-0.5">
                                                            {blog.publishedAt ? getFullDay(blog.publishedAt) : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Bookmark Icon */}
                                                <button 
                                                    className="ml-3"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleBookmark(blog.blog_id || blog._id);
                                                    }}
                                                    disabled={bookmarking}
                                                >
                                                    {userAuth?.bookmarked_blogs?.includes(blog.blog_id || blog._id) ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                                                        </svg>
                                                    ) : (
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-5 w-5 text-gray-400 hover:text-gray-700"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <NoDataMessage message="No Most Viewed Blogs" />
                        )}
                    </div>
                </div>

                {/* Trendy Posts Section */}
                <div className="w-full mt-12">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-medium text-2xl">
                            Trendy Posts
                        </h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleTrendyPrev}
                                disabled={trendyPage === 1 || trendyLoading}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleTrendyNext}
                                disabled={trendyLoading}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {
                            trendyLoading ? (
                                <div className="col-span-full flex justify-center py-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-gray-300 border-yellow-400 rounded-full animate-spin"></div>
                                        <span className="text-gray-600">Loading blogs...</span>
                                    </div>
                                </div>
                            ) : trendyBlogs.length === 0 ? (
                                <Loader />
                            ) : (
                                trendyBlogs.length ?
                                    trendyBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i}>
                                            <PostCard post={{
                                                banner: blog.banner,
                                                title: blog.title,
                                                description: blog.des || blog.description,
                                                author: {
                                                    name: blog.author?.personal_info?.fullname,
                                                    avatar: blog.author?.personal_info?.profile_img
                                                },
                                                date: blog.publishedAt || blog.createdAt,
                                                blog_id: blog.blog_id || blog._id
                                            }} />
                                        </AnimationWrapper>
                                    )) :
                                    <NoDataMessage message="No Trendy Blogs" />
                            )
                        }
                    </div>
                </div>

                {/* Top Posts Section */}
                <div className="w-full mt-12">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-medium text-2xl">
                            Top Posts
                        </h1>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleTopPrev}
                                disabled={topPage === 1 || topLoading}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleTopNext}
                                disabled={topLoading || topPage >= maxTopPage}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {
                            topLoading ? (
                                <div className="col-span-full flex justify-center py-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-gray-300 border-yellow-400 rounded-full animate-spin"></div>
                                        <span className="text-gray-600">Loading blogs...</span>
                                    </div>
                                </div>
                            ) : topBlogs.length === 0 ? (
                                <Loader />
                            ) : (
                                topBlogs.length ?
                                    topBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i}>
                                            <PostCard post={{
                                                banner: blog.banner,
                                                title: blog.title,
                                                description: blog.des || blog.description,
                                                author: {
                                                    name: blog.author?.personal_info?.fullname,
                                                    avatar: blog.author?.personal_info?.profile_img
                                                },
                                                date: blog.publishedAt || blog.createdAt,
                                                blog_id: blog.blog_id || blog._id
                                            }} />
                                        </AnimationWrapper>
                                    )) :
                                    <NoDataMessage message="No Top Blogs" />
                            )
                        }
                    </div>
                </div>
            </section>
        </AnimationWrapper>
    );
};

export default HomePage;
