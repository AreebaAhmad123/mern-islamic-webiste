import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import { Toaster } from "react-hot-toast";
import InPageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import { ManagePublishedBlogCard, ManageDraftBlogPost } from "../components/manage-blogcard.component";
import LoadMoreDataBtn from "../components/load-more.component";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";

export const ManageBlogs = () => {

    const [blogs, setBlogs] = useState(null);
    const [drafts, setDrafts] = useState(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState({ blogs: false, drafts: false });
    const [error, setError] = useState({ blogs: null, drafts: null });

    const [searchParams] = useSearchParams();
    let activeTab = searchParams.get("tab");

    const { userAuth } = useContext(UserContext);
    const access_token = userAuth?.access_token;

    const getBlogs = async ({ page, draft, deleteDocCount = 0 }) => {
        const type = draft ? 'drafts' : 'blogs';
        
        if (loading[type]) return; // Prevent multiple simultaneous requests
        
        setLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));
        
        try {
            console.log(`Fetching ${draft ? 'drafts' : 'published blogs'}...`);
            
            const response = await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/user-written-blogs",
                {
                    page,
                    draft,
                    query,
                    deleteDocCount
                },
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    },
                    timeout: 10000 // 10 second timeout
                }
            );

            console.log(`${draft ? 'Drafts' : 'Published blogs'} response:`, response.data);

            let formattedData = await filterPaginationData({
                state: draft ? drafts : blogs,
                data: response.data.blogs,
                page,
                user: access_token,
                countRoute: "/user-written-blogs-count",
                data_to_send: { draft, query }
            });

            console.log(`Formatted ${draft ? 'drafts' : 'blogs'} data:`, formattedData);

            // Append results if loading more pages
            if (page > 1) {
                if (draft) {
                    setDrafts(prev => ({
                        ...formattedData,
                        results: [...(prev?.results || []), ...(formattedData.results || [])]
                    }));
                } else {
                    setBlogs(prev => ({
                        ...formattedData,
                        results: [...(prev?.results || []), ...(formattedData.results || [])]
                    }));
                }
            } else {
                if (draft) {
                    setDrafts(formattedData);
                } else {
                    setBlogs(formattedData);
                }
            }
        } catch (err) {
            console.error(`Error fetching ${draft ? 'drafts' : 'published blogs'}:`, err);
            
            let errorMessage = "Failed to load blogs";
            if (err.response?.status === 401) {
                errorMessage = "Authentication required. Please log in again.";
            } else if (err.response?.status === 403) {
                errorMessage = "You don't have permission to view these blogs.";
            } else if (err.code === 'ECONNABORTED') {
                errorMessage = "Request timed out. Please try again.";
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            }
            
            setError(prev => ({ ...prev, [type]: errorMessage }));
            
            // Set empty state to show "no data" message
            if (draft) {
                setDrafts({ results: [], page: 1, totalDocs: 0 });
            } else {
                setBlogs({ results: [], page: 1, totalDocs: 0 });
            }
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    }

    // Load blogs and drafts on mount and when access_token changes
    useEffect(() => {
        console.log("ManageBlogs useEffect triggered");
        console.log("access_token:", access_token ? access_token.substring(0, 20) + "..." : "null");
        console.log("userAuth:", userAuth);
        
        if (access_token) {
            console.log("Loading blogs and drafts with token:", access_token.substring(0, 20) + "...");
            getBlogs({ page: 1, draft: false });
            getBlogs({ page: 1, draft: true });
        } else {
            console.log("No access token available, skipping blog loading");
        }
    }, [access_token]); // Removed blogs, drafts, query from dependencies to prevent infinite loops

    // Handle search query changes
    useEffect(() => {
        if (access_token && query !== undefined) {
            // Reset states when query changes
            setBlogs(null);
            setDrafts(null);
            setError({ blogs: null, drafts: null });
            
            // Fetch with new query
            getBlogs({ page: 1, draft: false });
            getBlogs({ page: 1, draft: true });
        }
    }, [query]);

    const handleSearch = (e) => {
        let searchQuery = e.target.value;
        setQuery(searchQuery);
        if (e.keyCode === 13 && searchQuery.length) {
            setBlogs(null);
            setDrafts(null);
        }
    };

    const handleChange = (e) => {
        if (!e.target.value.length) {
            setQuery("");
            setBlogs(null);
            setDrafts(null);
        }
    };

    const retryLoad = (type) => {
        setError(prev => ({ ...prev, [type]: null }));
        if (type === 'drafts') {
            getBlogs({ page: 1, draft: true });
        } else {
            getBlogs({ page: 1, draft: false });
        }
    };

    const debugDrafts = async () => {
        try {
            console.log("Testing debug endpoint...");
            const response = await axios.get(
                import.meta.env.VITE_SERVER_DOMAIN + "/debug/drafts",
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    },
                    timeout: 10000
                }
            );
            console.log("Debug response:", response.data);
            alert(`Debug Info:\nTotal Blogs: ${response.data.stats.totalBlogs}\nDrafts: ${response.data.stats.drafts}\nPublished: ${response.data.stats.published}`);
        } catch (err) {
            console.error("Debug error:", err);
            alert(`Debug Error: ${err.response?.data?.error || err.message}`);
        }
    };

    return (
        <>
            <Toaster />
            
           
            
            {/* Authentication check */}
            {!access_token && (
                <div className="text-center py-8">
                    <p className="text-red-500 mb-2">Please log in to view your blogs</p>
                    <Link to="/login" className="text-yellow-300 hover:text-yellow-500">
                        Go to Login
                    </Link>
                </div>
            )}
            
            {access_token && (
                <>
                    
                    <InPageNavigation routes={["Published Blogs", "Drafts"]} defaultActiveIndex={activeTab != 'draft' ? 0 : 1}>
                        {/* published Blogs */}
                        {loading.blogs ? (
                            <Loader />
                        ) : error.blogs ? (
                            <div className="text-center py-8">
                                <p className="text-red-500 mb-2">{error.blogs}</p>
                                <button 
                                    onClick={() => retryLoad('blogs')}
                                    className="text-yellow-400 hover:text-yellow-500"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : blogs === null ? (
                            <Loader />
                        ) : Array.isArray(blogs.results) && blogs.results.length ? (
                            <>
                                {blogs.results.map((blog, i) => {
                                    console.log('Published blog:', blog);
                                    return (
                                        <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                                            <ManagePublishedBlogCard blog={{ ...blog, index: i, setStateFunc: setBlogs }} index={i} />
                                        </AnimationWrapper>
                                    );
                                })}
                                {/* Use LoadMoreDataBtn for published blogs */}
                                <div className="flex justify-center mt-4">
                                    <LoadMoreDataBtn
                                        state={blogs}
                                        fetchDataFun={({ page }) => getBlogs({ page, draft: false })}
                                        additionalParam={{ page: (blogs.page || 1) + 1, draft: false }}
                                    />
                                </div>
                            </>
                        ) : (
                            <NoDataMessage message="No published blogs" />
                        )}
                        {/* draft Blogs */}
                        {loading.drafts ? (
                            <Loader />
                        ) : error.drafts ? (
                            <div className="text-center py-8">
                                <p className="text-red-500 mb-2">{error.drafts}</p>
                                <button 
                                    onClick={() => retryLoad('drafts')}
                                    className="text-yellow-300 hover:text-yellow-400"
                                >
                                    Try again
                                </button>
                            </div>
                        ) : drafts === null ? (
                            <Loader />
                        ) : Array.isArray(drafts.results) && drafts.results.length ? (
                            <>
                                {drafts.results.map((blog, i) => (
                                    <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                                        <ManageDraftBlogPost blog={{ ...blog, index: i, setStateFunc: setDrafts }} index={i} />
                                    </AnimationWrapper>
                                ))}
                                {/* Use LoadMoreDataBtn for drafts */}
                                <div className="flex justify-center mt-4">
                                    <LoadMoreDataBtn
                                        state={drafts}
                                        fetchDataFun={({ page }) => getBlogs({ page, draft: true })}
                                        additionalParam={{ page: (drafts.page || 1) + 1, draft: true }}
                                    />
                                </div>
                            </>
                        ) : (
                            <NoDataMessage message="No draft blogs" />
                        )}
                    </InPageNavigation>
                </>
            )}
        </>
    )
}

export default ManageBlogs;
