import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import { useState, useEffect, useContext, useCallback } from "react";
import Loader from "../components/loader.component";
import BlogPostCard from "../components/blog-post.component";
import MinimalBlogPost from "../components/nobanner-blog-post.component";
import { activeTabLineRef } from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component"
import LoadMoreDataBtn from "../components/load-more.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import axios from "axios";
import { UserContext } from "../App";
import CategorySlider from "../components/category-slider.component";
import TrendingBlogPost from "../components/TrendingBlogPost";
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import getDay from "../common/date";

const HomePage = ({ setBlogImages, setCategories }) => {
    let [blogs, setBlog] = useState(null);
    let [trendingblogs, setTrendingBlog] = useState(null);
    let [pageState, setPageState] = useState("home");
    const { userAuth, setUserAuth } = useContext(UserContext);
    const liked_blogs = userAuth?.liked_blogs || [];
    const bookmarked_blogs = userAuth?.bookmarked_blogs || [];

    // Pagination state for each section
    const [popularPage, setPopularPage] = useState(1);
    const [newPage, setNewPage] = useState(1);
    const [trendyPage, setTrendyPage] = useState(1);
    const [topPage, setTopPage] = useState(1);
    const [popularBlogs, setPopularBlogs] = useState([]);
    const [newBlogs, setNewBlogs] = useState([]);
    const [trendyBlogs, setTrendyBlogs] = useState([]);
    const [topBlogs, setTopBlogs] = useState([]);

    const baseCategories = ["islam", "prophets", "religion", "basics", "sahaba", "anbiya"];
    const tagCategories = (blogs?.results || []).flatMap(blog => blog.tags || []);
    const categories = Array.from(new Set([...baseCategories, ...tagCategories]));

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
        
        const images = allBlogs
            .filter(blog => blog.banner)
            .map(blog => blog.banner)
            .slice(0, 6);
            
        if (setBlogImages) {
            setBlogImages(images);
        }
    }, [blogs, trendingblogs, popularBlogs, newBlogs, trendyBlogs, topBlogs, categories, setCategories, setBlogImages]);

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
        try {
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs");
            if (page === 1) {
                setPopularBlogs(data.blogs.slice(0, 4));
            } else {
                setPopularBlogs(prev => [...prev, ...data.blogs.slice(0, 4)]);
            }
        } catch (err) {
            console.error("Error fetching popular blogs:", err);
            setPopularBlogs([]); // Set empty array on error
        }
    };

    // Fetch blogs for New section with pagination
    const fetchNewBlogs = async (page = 1) => {
        try {
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs");
            if (page === 1) {
                setNewBlogs(data.blogs.slice(0, 4));
            } else {
                setNewBlogs(prev => [...prev, ...data.blogs.slice(0, 4)]);
            }
        } catch (err) {
            console.error("Error fetching new blogs:", err);
            setNewBlogs([]); // Set empty array on error
        }
    };

    // Fetch blogs for Trendy section with pagination
    const fetchTrendyBlogs = async (page = 1) => {
        try {
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs");
            if (page === 1) {
                setTrendyBlogs(data.blogs.slice(0, 4));
            } else {
                setTrendyBlogs(prev => [...prev, ...data.blogs.slice(0, 4)]);
            }
        } catch (err) {
            console.error("Error fetching trendy blogs:", err);
            setTrendyBlogs([]); // Set empty array on error
        }
    };

    // Fetch blogs for Top section with pagination
    const fetchTopBlogs = async (page = 1) => {
        try {
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs");
            if (page === 1) {
                setTopBlogs(data.blogs.slice(0, 4));
            } else {
                setTopBlogs(prev => [...prev, ...data.blogs.slice(0, 4)]);
            }
        } catch (err) {
            console.error("Error fetching top blogs:", err);
            setTopBlogs([]); // Set empty array on error
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                activeTabLineRef.current.click();
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

    const handleShowMoreMostViewed = () => {
        const nextPage = mostViewedPage + 1;
        setMostViewedPage(nextPage);
        fetchMostViewedBlogs(nextPage);
    };

    // Arrow navigation handlers
    const handlePopularNext = () => {
        const nextPage = popularPage + 1;
        setPopularPage(nextPage);
        fetchPopularBlogs(nextPage);
    };

    const handlePopularPrev = () => {
        if (popularPage > 1) {
            const prevPage = popularPage - 1;
            setPopularPage(prevPage);
            setPopularBlogs(prev => prev.slice(0, -4));
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
            setNewBlogs(prev => prev.slice(0, -4));
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
            setTrendyBlogs(prev => prev.slice(0, -4));
        }
    };

    const handleTopNext = () => {
        const nextPage = topPage + 1;
        setTopPage(nextPage);
        fetchTopBlogs(nextPage);
    };

    const handleTopPrev = () => {
        if (topPage > 1) {
            const prevPage = topPage - 1;
            setTopPage(prevPage);
            setTopBlogs(prev => prev.slice(0, -4));
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

    const handleLikeToggle = (updatedLikedBlogs) => {
        setUserAuth((prev) => ({
            ...prev,
            liked_blogs: updatedLikedBlogs,
        }));
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
                                disabled={popularPage === 1}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handlePopularNext}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {
                            popularBlogs.length === 0 ? (
                                <Loader />
                            ) : (
                                popularBlogs.length ?
                                    popularBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i}>
                                            <BlogPostCard content={blog} author={blog.author.personal_info} liked={liked_blogs.includes(blog.blog_id)} bookmarked={bookmarked_blogs.includes(blog.blog_id)} setUserAuth={setUserAuth} userAuth={userAuth} onLikeToggle={handleLikeToggle} />
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
                                disabled={newPage === 1}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleNewNext}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {newBlogs.length === 0 ? (
                            <Loader />
                        ) : newBlogs.length ? (
                            newBlogs.slice(0, 6).map((blog, i) => (
                                <div
                                    key={i}
                                    className="flex bg-white rounded-xl shadow p-4 gap-4 items-center"
                                >
                                    {/* Blog Image */}
                                    <img
                                        src={blog.banner || "/src/imgs/default.jpg"}
                                        alt={blog.title}
                                        className="w-32 h-32 object-cover rounded-lg"
                                    />
                                    {/* Blog Content */}
                                    <div className="flex-1 flex flex-col justify-between h-full">
                                        <div>
                                            <h2 className="font-semibold text-lg line-clamp-2">{blog.title}</h2>
                                            <p className="text-gray-500 text-sm mt-1 line-clamp-2">{blog.des || blog.description}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                                                <img
                                                    src={blog.author?.personal_info?.profile_img || "/src/imgs/default.jpg"}
                                                    alt={blog.author?.personal_info?.fullname}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{blog.author?.personal_info?.fullname}</span>
                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                        {blog.createdAt ? getDay(blog.createdAt) : ""}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Bookmark Icon */}
                                            <button className="ml-3">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5 text-gray-400 hover:text-gray-700"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-7 7 7V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
                                disabled={trendyPage === 1}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleTrendyNext}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {
                            trendyBlogs.length === 0 ? (
                                <Loader />
                            ) : (
                                trendyBlogs.length ?
                                    trendyBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i}>
                                            <BlogPostCard content={blog} author={blog.author?.personal_info} liked={liked_blogs.includes(blog.blog_id)} bookmarked={bookmarked_blogs.includes(blog.blog_id)} setUserAuth={setUserAuth} userAuth={userAuth} onLikeToggle={handleLikeToggle} />
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
                                disabled={topPage === 1}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={handleTopNext}
                                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {
                            topBlogs.length === 0 ? (
                                <Loader />
                            ) : (
                                topBlogs.length ?
                                    topBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i}>
                                            <BlogPostCard content={blog} author={blog.author.personal_info} liked={liked_blogs.includes(blog.blog_id)} bookmarked={bookmarked_blogs.includes(blog.blog_id)} setUserAuth={setUserAuth} userAuth={userAuth} onLikeToggle={handleLikeToggle} />
                                        </AnimationWrapper>
                                    )) :
                                    <NoDataMessage message="No Top Blogs" />
                            )
                        }
                    </div>
                </div>
            </section>

            {/* Additional section with InPageNavigation for trending blogs functionality */}
            <section className="h-cover flex justify-center gap-10 px-[5vw] mt-12">
                {/* Latest blogs with InPageNavigation */}
                <div className="w-full">
                    <InPageNavigation routes={[pageState, "trending blogs"]} defaultHidden={["trending blogs"]}>
                        <>
                            {
                                blogs == null ? (
                                    <Loader />
                                ) : (
                                    blogs.results.length ?
                                        blogs.results.map((blog, i) => (
                                            <AnimationWrapper key={i}>
                                                <BlogPostCard content={blog} author={blog.author.personal_info} liked={liked_blogs.includes(blog.blog_id)} bookmarked={bookmarked_blogs.includes(blog.blog_id)} setUserAuth={setUserAuth} userAuth={userAuth} onLikeToggle={handleLikeToggle} />
                                            </AnimationWrapper>
                                        )) :
                                        <NoDataMessage message="No Blogs Published" />
                                )
                            }
                            <LoadMoreDataBtn state={blogs} fetchDataFun={(pageState == "home" ? fetchLatestBlogs : fetchBlogsByCategory)} />
                        </>
                        {
                            trendingblogs == null ? (
                                <Loader />
                            ) : (
                                trendingblogs.length ?
                                    trendingblogs.map((blog, i) => (
                                        <AnimationWrapper transition={{ duration: 1, delay: i * 0.1 }} key={i}>
                                            <MinimalBlogPost blog={blog} index={i} />
                                        </AnimationWrapper>
                                    ))
                                    : <NoDataMessage message="No Trending Blogs found" />
                            )
                        }
                    </InPageNavigation>
                </div>

                {/* Sidebar with categories and trending */}
                <div className="min-w-[40%] lg:min-w-[400px] max-w-min border-1 border-grey pl-8 pt-3 max-md:hidden">
                    <div className="flex flex-col gap-10">
                        <div>
                            <h1 className="font-medium text-xl mb-8">
                                Stories from all interests
                            </h1>
                        </div>

                        <div>
                            <div className="flex gap-3 flex-wrap">
                                {
                                    categories.map((category, i) => (
                                        <button onClick={loadBlogByCategory} className={`tag ${pageState === category ? "bg-black text-white" : ""}`} key={i}>
                                            {category}
                                        </button>
                                    ))
                                }
                            </div>
                        </div>

                        <div>
                            <h1 className="font-medium text-xl mb-8">
                                Trending <i className="fi fi-rr-arrow-trend-up"></i>
                            </h1>
                            {
                                trendingblogs == null ? (
                                    <Loader />
                                ) : (
                                    trendingblogs.length ?
                                        trendingblogs.map((blog, i) => (
                                            <AnimationWrapper transition={{ duration: 1, delay: i * 0.1 }} key={i}>
                                                <MinimalBlogPost blog={blog} index={i} />
                                            </AnimationWrapper>
                                        ))
                                        : <NoDataMessage message="No Trending Blogs found" />
                                )
                            }
                        </div>
                    </div>
                </div>
            </section>
        </AnimationWrapper>
    );
};

export default HomePage;
