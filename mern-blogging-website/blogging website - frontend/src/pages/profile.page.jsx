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
    let { id: profileId } = useParams();

    let [profile, setProfile] = useState(profileDataStructure);
    let [loading, setLoading] = useState(true);
    let [blogs, setBlogs] = useState(null);
    let [profileLoaded, setProfileLoaded] = useState("");
    const [error, setError] = useState(null);


    let { personal_info: { fullname, username: profile_username, profile_img, bio }, account_info: { total_posts, total_reads }, social_links, joinedAt } = profile;
    const { userAuth } = useContext(UserContext);
    const username = userAuth?.username || "";
    const fetchUserProfile = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", {
            username: profileId
        })
            .then(({ data: user }) => {
                if (user) {
                    setProfile(user);
                    console.log("Fetched profile:", user);
                    setProfileLoaded(profileId);
                    getBlogs({ user_id: user._id });
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
    { error && <NoDataMessage message={error} /> }

    const getBlogs = ({ page = 1, user_id }) => {
        user_id = user_id || blogs?.user_id;

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
            author: user_id,
            page
        })
            .then(({ data: { blogs: newBlogs, total } }) => { // Destructure blogs and total
                setBlogs(prev => {
                    // Reset if new user or first page
                    if (page === 1 || !prev || prev.user_id !== user_id) {
                        return {
                            results: newBlogs,
                            page: 1,
                            totalDocs: total,
                            user_id
                        };
                    }

                    // Merge and avoid duplicates
                    const mergedBlogs = [...prev.results];
                    newBlogs.forEach(blog => {
                        if (!mergedBlogs.some(b => b.blog_id === blog.blog_id)) {
                            mergedBlogs.push(blog);
                        }
                    });

                    return {
                        results: mergedBlogs,
                        page: page,
                        totalDocs: total,
                        user_id
                    };
                });
            })
            .catch(err => {
                console.error("Error fetching blogs:", err);
            });
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

    const resetStates = () => {
        setProfile(profileDataStructure);
        setLoading(true);
        setProfileLoaded("");
    }

    return (
        <AnimationWrapper>
            {
                loading ? <Loader /> :
                    profile.personal_info.username.length ?
                        // <section className="h-cover md:flex flex-row-reverse items-start gap-5 min-[1100px]:gap-12">
                        //     {/* Profile Card - Sticky on desktop */}
                        //     <div className="flex flex-col max-md:items-center gap-5 min-w-[250px] md:w-[50%] md:pl-8 md:border-l border-grey md:sticky md:top-[100px] md:py-10">
                        //         <img src={profile_img} className="w-48 h-48 bg-grey rounded-full md:w-32 md:h-32" />
                        //         <h1 className="text-2xl font-medium">{profile_username}</h1>
                        //         <p className="text-xl capitalize h-6">{fullname}</p>
                        //         <p>{total_posts.toLocaleString()} Blogs - {total_reads.toLocaleString()} Reads</p>
                        //         <div className="flex gap-4 mt-2">
                        //             {
                        //                 profileId === username ?
                        //                     <Link to="/settings/edit-profile" className="btn-light rounded-md">Edit Profile</Link>
                        //                     : ""
                        //             }
                        //         </div>
                        //     </div>

                        //     {/* Main Content Area */}
                        //     <div className="max-md:mt-12 w-full">
                        //         <InPageNavigation routes={["Blogs Published", "About"]} defaultHidden={["About"]}>
                        //             <>
                        //                 {
                        //                     blogs == null ? (
                        //                         <Loader />
                        //                     ) : (
                        //                         blogs.results.length ?
                        //                             blogs.results.map((blog, i) => (
                        //                                 <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                        //                                     <BlogPostCard content={blog} author={blog.author.personal_info} />
                        //                                 </AnimationWrapper>
                        //                             )) :
                        //                             <NoDataMessage message="No Blogs Published" />
                        //                     )
                        //                 }


                        //                 {
                        //                     blogs?.results.length < blogs?.totalDocs && (
                        //                         <LoadMoreDataBtn
                        //                             state={blogs}
                        //                             fetchDataFun={() => getBlogs({ page: blogs.page + 1 })}
                        //                         />
                        //                     )
                        //                 }
                        //             </>


                        //             <AboutUser className="md:hidden" bio={bio} social_links={social_links} joinedAt={joinedAt} />
                        //         </InPageNavigation>
                        //     </div>
                        // </section>
                        <section className="h-cover md:flex flex-row-reverse items-start gap-5 min-[1100px]:gap-12">
                            {/* Desktop Sidebar */}
                            <div className="flex flex-col max-md:items-center gap-5 min-w-[250px] md:w-[50%] md:pl-8 md:border-l border-grey md:sticky md:top-[100px] md:py-10">
                                {/* Profile Card Content */}
                                <img src={profile_img} className="w-48 h-48 bg-grey rounded-full md:w-32 md:h-32" />
                                <h1 className="text-2xl font-medium">{profile_username}</h1>
                                <p className="text-xl capitalize h-6">{fullname}</p>
                                <p>{total_posts.toLocaleString()} Blogs - {total_reads.toLocaleString()} Reads</p>

                                {/* Desktop About Section */}
                                <div className="hidden md:block w-full">
                                    <AboutUser bio={bio} social_links={social_links} joinedAt={joinedAt} />
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="max-md:mt-12 w-full">
                                <InPageNavigation routes={["Blogs Published", "About"]} defaultHidden={["About"]}>
                                    {/* Blogs Content */}
                                    {blogs == null ? (
                                        <Loader />
                                    ) : blogs.results.length ? (
                                        blogs.results.map((blog, i) => (
                                            <AnimationWrapper key={i}>
                                                <BlogPostCard content={blog} author={blog.author.personal_info} />
                                            </AnimationWrapper>
                                        ))
                                    ) : (
                                        <NoDataMessage message="No Blogs Published" />
                                    )}

                                    {/* Mobile About Section */}
                                    <div className="md:hidden">
                                        <AboutUser bio={bio} social_links={social_links} joinedAt={joinedAt} />
                                    </div>
                                </InPageNavigation>
                            </div>
                        </section>
                        : <PageNotFound />
            }
        </AnimationWrapper>
    )

}
export default ProfilePage;
