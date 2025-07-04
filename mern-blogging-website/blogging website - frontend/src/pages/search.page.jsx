import { useParams } from "react-router-dom";
import InPageNavigation from "../components/inpage-navigation.component";
import { useEffect, useState, useContext } from "react";
import Loader from "../components/loader.component";
import AnimationWrapper from "../common/page-animation";
import BlogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreDataBtn from "../components/load-more.component";
import axios from "axios";
import { filterPaginationData } from "../common/filter-pagination-data";
import UserCard from "../components/usercard.component";
import { UserContext } from "../App";

const SearchPage = () => {
    let { query } = useParams();
    const { userAuth, setUserAuth } = useContext(UserContext);

    let [blogs, setBlogs] = useState(null);
    let [users, setUsers] = useState(null);

    const searchBlogs = ({ page = 1, create_new_arr = false }) => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/search-blogs", { query, page })
            .then(async ({ data }) => {
                let formattedData = await filterPaginationData({
                    state: blogs,
                    data: data.blogs,
                    page,
                    countRoute: "/search-blogs-count",
                    data_to_send: { query },
                    create_new_arr
                });
                setBlogs(formattedData);
            })
            .catch((err) => {
                console.log(err);
            });
    };

    const fetchUsers = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/search-users", { query })
            .then(({ data: { users } }) => {
                setUsers(users);
            })
            .catch(err => {
                console.log(err);
            });
    };

    const resetState = () => {
        setBlogs(null);
        setUsers(null);
    };

    useEffect(() => {
        resetState();
        fetchUsers();
        searchBlogs({ page: 1, create_new_arr: true });
    }, [query]);

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

    const UserCardWrapper = () => {
        return (
            <>
                {users === null ? (
                    <Loader />
                ) : users.length ? (
                    users.map((user, i) => (
                        <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.08 }}>
                            <UserCard user={user} />
                        </AnimationWrapper>
                    ))
                ) : (
                    <NoDataMessage message="No user found" />
                )}
            </>
        );
    };

    return (
        <section className="h-cover flex justify-center gap-10">
            <div className="w-full">
                <InPageNavigation 
                    routes={[`Search Results from ${query}`, "Accounts Matched"]} 
                    defaultHidden={["Accounts Matched"]}
                >
                    {[
                        // Tab 1: Blog Results
                        <>
                            {blogs === null ? (
                                <Loader />
                            ) : (
                                <>
                                    {blogs.results.length ? (
                                        <>
                                            {blogs.results.map((blog, i) => (
                                                <AnimationWrapper
                                                    key={i}
                                                    transition={{ duration: 1, delay: i * 0.1 }}
                                                >
                                                    <BlogPostCard
                                                        content={blog}
                                                        author={blog.author.personal_info}
                                                        liked={userAuth?.liked_blogs?.includes(blog.blog_id)}
                                                        onLikeToggle={handleLikeToggle}
                                                    />
                                                </AnimationWrapper>
                                            ))}
                                            <LoadMoreDataBtn state={blogs} fetchDataFun={searchBlogs} />
                                        </>
                                    ) : (
                                        <NoDataMessage message="No blogs published" />
                                    )}
                                </>
                            )}
                        </>,
                        // Tab 2: User Results
                        <UserCardWrapper />
                    ]}
                </InPageNavigation>
            </div>
            
            <div className="min-w-[40%] lg:min-w-[350px] max-w-min border-1 border-grey pl-8 pt-3 max-md:hidden">
                <h1 className="font-medium text-xl mb-8">
                    User related to search <i className="fi fi-rr-user mt-1"></i>
                </h1>
                <UserCardWrapper />
            </div>
        </section>
    );
};

export default SearchPage;