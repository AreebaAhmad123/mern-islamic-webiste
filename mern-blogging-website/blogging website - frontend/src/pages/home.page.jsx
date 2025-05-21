import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import { useState, useEffect } from "react";
import Loader from "../components/loader.component";
import BlogPostCard from "../components/blog-post.component";
import MinimalBlogPost from "../components/nobanner-blog-post.component";
import { activeTabLineRef } from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component"
import LoadMoreDataBtn from "../components/load-more.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import axios from "axios";

const HomePage = () => {
    let [blogs, setBlog] = useState(null);
    let [trendingblogs, setTrendingBlog] = useState(null);
    let [pageState, setPageState] = useState("home");

    let categories = ["islam", "prophets", "religion", "basics", "sahaba", "anbiya"];

    const fetchLatestBlogs = async (page = 1) => {
        try {
          const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page });
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
          setBlog(prev => prev || { results: [], page: 1, totalDocs: 0 });
        }
      }

      const fetchBlogsByCategory = async (page = 1) => {
        try {
          const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
            tag: pageState,
            page,
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
          setBlog(prev => prev || { results: [], page: 1, totalDocs: 0 });
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

    const fetchTrendingBlogs = () => {
        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs")
            .then(({ data }) => {
                setTrendingBlog(data.blogs);
            })
            .catch(err => {
                console.log(err);
            });
    };

    useEffect(() => {
        activeTabLineRef.current.click();
    setBlog(null); // Reset to trigger loader
        if (pageState == "home") {
            fetchLatestBlogs(1);
        }
        else {
            fetchBlogsByCategory(1);
        }
        if (!trendingblogs) {
            fetchTrendingBlogs();
        }
    }, [pageState]);
    const loadMore = pageState === "home" ? fetchLatestBlogs : fetchBlogsByCategory;

    return (
        
        <AnimationWrapper>
            <section className="h-cover flex justify-center gap-10">
                {/* latest blogs */}
                <div className="w-full">
                    <InPageNavigation routes={[pageState, "trending blogs"]} defaultHidden={"trending blog"}>
                        <>
                            {
                                blogs == null ? (
                                    <Loader />
                                ) : (
                                    blogs.results.length ?
                                        blogs.results.map((blog, i) => (
                                            <AnimationWrapper key={i}>
                                                <BlogPostCard content={blog} author={blog.author.personal_info} />
                                            </AnimationWrapper>
                                        )) :
                                        <NoDataMessage message="No Blogs Published" />
                                )
                            }
                            <LoadMoreDataBtn state ={blogs} fetchDataFun ={(pageState=="home" ? fetchLatestBlogs : fetchBlogsByCategory)}/>

                        </>
                    </InPageNavigation>
                </div>

                {/* filters/trending */}
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
