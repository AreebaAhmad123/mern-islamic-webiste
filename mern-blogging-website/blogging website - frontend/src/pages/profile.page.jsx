import { useState, useContext, useEffect } from "react";
import { useParams } from "react-router-dom";
import { UserContext } from "../App";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import axios from "axios";
import AboutUser from "../components/about.component"
import { Link } from "react-router-dom";
import BlogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component"
import LoadMoreDataBtn from "../components/load-more.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import InPageNavigation from "../components/inpage-navigation.component";
import PageNotFound from "./404.page";
import PostCard from "../components/PostCard";


export const profileDataStructure = {
    personal_info: {
        fullname: "",
        username: "",
        profile_img: "",
        bio: "",
    },
    account_info: {
        total_posts: 0,
        total_blogs: 0,
    },
    social_links: {},
    joinedAt: ""
}



const ProfilePage = () => {
    console.log("Rendering ProfilePage");
    let { id: profileId } = useParams();

    let [profile, setProfile] = useState(profileDataStructure);
    let [loading, setLoading] = useState(true);
    let [blogs, setBlogs] = useState(null);
    let [profileLoaded, setProfileLoaded] = useState("");
    const [error, setError] = useState(null);
    const [bookmarkedBlogs, setBookmarkedBlogs] = useState(null);
    const [loadingBookmarks, setLoadingBookmarks] = useState(false);


    let { personal_info: { fullname, username: profile_username, profile_img, bio }, account_info: { total_posts, total_reads }, social_links, joinedAt } = profile;
    const { userAuth, setUserAuth } = useContext(UserContext);
    const username = userAuth?.username || "";
    const isAdmin = userAuth?.isAdmin || userAuth?.admin || userAuth?.role === 'admin';
    const isOwnProfile = userAuth?.username && profile_username && userAuth.username === profile_username;
    
    console.log("Profile debug:", {
        userAuthUsername: userAuth?.username,
        profileUsername: profile_username,
        isOwnProfile,
        bookmarked_blogs: userAuth?.bookmarked_blogs,
        bookmarkedBlogsState: bookmarkedBlogs,
        profile: profile,
        userAuth: userAuth
    });
    
    if (!userAuth) {
        console.log("User not authenticated or userAuth not loaded yet.");
        return <Loader />;
    }

    const handleLikeToggle = (liked, blog_id) => {
        setUserAuth((prev) => {
            if (!prev) return prev;
            
            let liked_blogs = prev.liked_blogs || [];
            
            if (liked) {
                if (!liked_blogs.includes(blog_id)) {
                    liked_blogs = [...liked_blogs, blog_id];
                }
            } else {
                liked_blogs = liked_blogs.filter(id => id !== blog_id);
            }
            
            return { ...prev, liked_blogs };
        });
    };

    const fetchUserProfile = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", {
            username: profileId
        })
            .then(({ data: user }) => {
                if (user) {
                    setProfile(user);
                    console.log("Fetched profile:", user);
                    setProfileLoaded(profileId);
                    // Only fetch blogs for admins
                    if (isAdmin) {
                        getBlogs({ user_id: user._id });
                    }
                    // Always update userAuth if viewing own profile
                    if (isOwnProfile) {
                        import("../common/auth").then(({ updateUserAuth }) => {
                            updateUserAuth(user, setUserAuth);
                        });
                    }
                } else {
                    setError("User not found");
                }
                setLoading(false);
            })
            .catch(err => {
                console.log(err);
                setLoading(false);
            });
    }

    const getBlogs = async ({ page = 1, user_id }) => {
        user_id = user_id || blogs?.user_id;

        try {
            const { data: { blogs: newBlogs, total } } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
                author: user_id,
                page
            });

            const formattedData = await filterPaginationData({
                state: blogs,
                data: newBlogs,
                page,
                countRoute: "/search-blogs-count",
                data_to_send: { author: user_id },
                create_new_arr: page === 1
            });

            if (formattedData) {
                setBlogs(formattedData);
            }
        } catch (err) {
            console.error("Error fetching blogs:", err);
        }
    };

    // Wrapper function for LoadMoreDataBtn
    const loadMoreBlogs = (user_id, page) => {
        getBlogs({ page, user_id });
    };

    // Function to get bookmarked blogs with pagination
    const getBookmarkedBlogs = async ({ page = 1 }) => {
        console.log("getBookmarkedBlogs called:", {
            page,
            bookmarked_blogs: userAuth?.bookmarked_blogs,
            length: userAuth?.bookmarked_blogs?.length,
            userAuth: userAuth
        });
        
        if (!userAuth?.bookmarked_blogs?.length) {
            console.log("No bookmarked blogs found, setting empty state");
            setBookmarkedBlogs({
                results: [],
                page: 1,
                totalDocs: 0
            });
            return;
        }

        try {
            console.log("Making API call to get-blogs-by-ids with:", {
                blog_ids: userAuth.bookmarked_blogs,
                page,
                limit: 5
            });
            
            const { data: { blogs: newBookmarkedBlogs, totalDocs } } = await axios.post(
                import.meta.env.VITE_SERVER_DOMAIN + "/get-blogs-by-ids",
                { 
                    blog_ids: userAuth.bookmarked_blogs,
                    page,
                    limit: 5
                }
            );
            
            console.log("Setting bookmarkedBlogs:", newBookmarkedBlogs);
            console.log("Rendering bookmarkedBlogs.results:", newBookmarkedBlogs);
            newBookmarkedBlogs.forEach((blog, i) => {
                console.log(`Blog #${i}:`, blog);
            });
            // Custom pagination logic for bookmarked blogs
            if (bookmarkedBlogs !== null && page !== 1) {
                // Append to existing results
                setBookmarkedBlogs({
                    ...bookmarkedBlogs,
                    results: [...bookmarkedBlogs.results, ...newBookmarkedBlogs],
                    page: page,
                    totalDocs: totalDocs
                });
            } else {
                // Create new state
                setBookmarkedBlogs({
                    results: newBookmarkedBlogs || [],
                    page: 1,
                    totalDocs: totalDocs
                });
            }
        } catch (err) {
            console.error("Error fetching bookmarked blogs:", err);
            setBookmarkedBlogs({
                results: [],
                page: 1,
                totalDocs: 0
            });
        }
    };

    // Wrapper function for LoadMoreDataBtn for bookmarked blogs
    const loadMoreBookmarkedBlogs = ({ page }) => {
        getBookmarkedBlogs({ page });
    };

    useEffect(() => {
        if (profileId !== profileLoaded) {
            setBlogs(null);
        }

        if (blogs === null) {
            resetStates();
            fetchUserProfile();
        }
    }, [profileId, blogs]);

    useEffect(() => {
        console.log("useEffect for bookmarks triggered:", {
            bookmarkedBlogs,
            userAuth: !!userAuth,
            profileId,
            isOwnProfile
        });
        
        if (bookmarkedBlogs === null && userAuth && isOwnProfile) {
            console.log("Fetching bookmarked blogs...");
            setLoadingBookmarks(true);
            getBookmarkedBlogs({ page: 1 }).finally(() => {
                setLoadingBookmarks(false);
            });
        }
    }, [userAuth, bookmarkedBlogs, profileId, isOwnProfile]);

    useEffect(() => {
        // Automatically load bookmarks for non-admin users when profile loads
        if (isOwnProfile && !isAdmin && profileLoaded === profileId) {
            getBookmarkedBlogs({ page: 1 });
        }
    }, [isOwnProfile, isAdmin, profileLoaded, profileId]);

    const resetStates = () => {
        setProfile(profileDataStructure);
        setLoading(true);
        setProfileLoaded("");
        setBookmarkedBlogs(null);
    }

    return (
        <AnimationWrapper>
            {
                loading ? <Loader /> :
                    profile.personal_info.username.length ?
                        (
                            <section className="h-cover md:flex flex-row-reverse items-start gap-5 min-[1100px]:gap-12">
                                {/* Desktop Sidebar */}
                                <div className="flex flex-col items-center justify-center w-full md:w-[50%] md:pl-8 md:border-l border-grey md:sticky md:top-[100px] md:py-10">
                                    <AboutUser 
                                        personal_info={profile.personal_info}
                                        bio={bio}
                                        social_links={social_links}
                                        joinedAt={joinedAt}
                                    />
                                </div>
                                {/* Main Content Area */}
                                <div className="w-full">
                                    {isOwnProfile ? (
                                        isAdmin ? (
                                            <InPageNavigation
                                                routes={["Published Blogs", "Bookmarked Blogs"]}
                                                defaultActiveIndex={0}
                                            >
                                                {/* Published Blogs Tab */}
                                                <div label="Published Blogs">
                                                    {blogs == null ? (
                                                        <Loader />
                                                    ) : blogs.results.length ? (
                                                        <>
                                                            {blogs.results.map((blog, i) => (
                                                                <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                                                    <BlogPostCard
                                                                        content={blog}
                                                                        author={blog.author.personal_info}
                                                                        liked={userAuth?.liked_blogs?.includes(blog.blog_id)}
                                                                        onLikeToggle={handleLikeToggle}
                                                                    />
                                                                </AnimationWrapper>
                                                            ))}
                                                            {/* Load More Button */}
                                                            <LoadMoreDataBtn
                                                                state={blogs}
                                                                fetchDataFun={loadMoreBlogs}
                                                                additionalParam={blogs.user_id}
                                                            />
                                                        </>
                                                    ) : (
                                                        <NoDataMessage message="No Blogs Published" />
                                                    )}
                                                </div>
                                                {/* Bookmarked Blogs Tab */}
                                                <div label="Bookmarked Blogs">
                                                    {(!bookmarkedBlogs || !Array.isArray(bookmarkedBlogs.results)) ? (
                                                        <Loader />
                                                    ) : bookmarkedBlogs.results.length === 0 ? (
                                                        <NoDataMessage message="No Bookmarked Blogs" />
                                                    ) : (
                                                        <>
                                                            {bookmarkedBlogs.results.map((blog, i) => (
                                                                <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                                                    <BlogPostCard
                                                                        content={blog}
                                                                        author={blog.author.personal_info}
                                                                        liked={userAuth?.liked_blogs?.includes(blog.blog_id)}
                                                                        onLikeToggle={handleLikeToggle}
                                                                    />
                                                                </AnimationWrapper>
                                                            ))}
                                                            <div className="flex justify-center mt-4">
                                                                <LoadMoreDataBtn
                                                                    state={bookmarkedBlogs}
                                                                    fetchDataFun={loadMoreBookmarkedBlogs}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </InPageNavigation>
                                        ) : (
                                            <div>
                                                {/* Only Bookmarked Blogs for non-admins */}
                                                <div label="Bookmarked Blogs">
                                                    <h2 className="text-2xl font-semibold mb-6">Bookmarked Blogs</h2>
                                                    {(!bookmarkedBlogs || !Array.isArray(bookmarkedBlogs.results)) ? (
                                                        <Loader />
                                                    ) : bookmarkedBlogs.results.length === 0 ? (
                                                        <NoDataMessage message="No Bookmarked Blogs" />
                                                    ) : (
                                                        <>
                                                            {bookmarkedBlogs.results.map((blog, i) => (
                                                                <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                                                    <BlogPostCard
                                                                        content={blog}
                                                                        author={blog.author.personal_info}
                                                                        liked={userAuth?.liked_blogs?.includes(blog.blog_id)}
                                                                        onLikeToggle={handleLikeToggle}
                                                                    />
                                                                </AnimationWrapper>
                                                            ))}
                                                            <div className="flex justify-center mt-4">
                                                                <LoadMoreDataBtn
                                                                    state={bookmarkedBlogs}
                                                                    fetchDataFun={loadMoreBookmarkedBlogs}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        // User viewing someone else's profile
                                        <InPageNavigation
                                            routes={["Published Blogs", "About"]}
                                            defaultActiveIndex={0}
                                        >
                                            {isAdmin && (
                                                <div label="Published Blogs">
                                                    {blogs == null ? (
                                                        <Loader />
                                                    ) : blogs.results.length ? (
                                                        <>
                                                            {blogs.results.map((blog, i) => (
                                                                <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                                                    <BlogPostCard 
                                                                        content={blog} 
                                                                        author={blog.author.personal_info} 
                                                                        liked={userAuth?.liked_blogs?.includes(blog.blog_id)}
                                                                        onLikeToggle={handleLikeToggle}
                                                                    />
                                                                </AnimationWrapper>
                                                            ))}
                                                            {/* Load More Button */}
                                                            <LoadMoreDataBtn
                                                                state={blogs}
                                                                fetchDataFun={loadMoreBlogs}
                                                                additionalParam={blogs.user_id}
                                                            />
                                                        </>
                                                    ) : (
                                                        <NoDataMessage message="No Blogs Published" />
                                                    )}
                                                </div>
                                            )}
                                        </InPageNavigation>
                                    )}
                                </div>
                            </section>
                        )
                    : <PageNotFound />
            }
        </AnimationWrapper>
    )
}

export default ProfilePage;
