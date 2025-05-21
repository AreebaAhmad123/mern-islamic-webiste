import { Toaster, toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { EditorContext } from "../App";
import { userContext } from "../App";
import axios from "axios";
import { lookInSession } from "../common/session";

const PublishForm = () => {
  const navigate = useNavigate();
  const characterLimit = 200;
  const { blog, setBlog, setEditorState } = useContext(EditorContext);
  const { userAuth } = useContext(userContext);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Merge blog from context with blog_draft from localStorage
    const storedBlog = JSON.parse(sessionStorage.getItem("blog_draft") || "{}");
    const mergedBlog = {
      title: blog.title || storedBlog.title || "",
      banner: blog.banner || storedBlog.banner || "",
      content: blog.content || storedBlog.content || [],
      tags: blog.tags || storedBlog.tags || [],
      des: blog.des || storedBlog.des || "",
      author: blog.author || storedBlog.author || { personal_info: {} },
    };
    setBlog(mergedBlog);
    setTags(mergedBlog.tags);
  }, [setBlog]);

  // const publishBlog = (e) => {
  //   e,preventDefault();
  //   setIsLoading(true)
  //   const { title, des, banner, content } = blog;
  //   const userAuth = JSON.parse(lookInSession("user") || "{}");
  //   const access_token = userAuth.access_token;
  //   const publishBlog = async (e) => {
  //     e.preventDefault();
  //     setIsLoading(true);
    
  //     // Convert EditorJS data to clean format
  //     const cleanContent = blog.content?.blocks ? {
  //       time: blog.content.time,
  //       blocks: blog.content.blocks.map(block => ({
  //         type: block.type,
  //         data: block.data
  //       })),
  //       version: blog.content.version
  //     } : { blocks: [] };
    
  //     try {
  //       const loadingToast = toast.loading(blog.draft ? "Saving draft..." : "Publishing...");
        
  //       const response = await axios.post(
  //         `${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`,
  //         {
  //           ...blog,
  //           content: cleanContent,
  //           draft: blog.draft
  //         },
  //         {
  //           headers: {
  //             'Authorization': `Bearer ${access_token}`,
  //             'Content-Type': 'application/json'
  //           },
  //           timeout: 10000 // 10 second timeout
  //         }
  //       );
    
  //       toast.dismiss(loadingToast);
  //       toast.success(blog.draft ? "Draft saved!" : "Published successfully!");
        
  //       if (!blog.draft) {
  //         sessionStorage.removeItem("blog_draft");
  //         setTimeout(() => navigate("/"), 1500);
  //       }
  //     } catch (error) {
  //       console.error("Publish error:", error);
        
  //       let errorMessage = "Failed to publish";
  //       if (error.response) {
  //         errorMessage = error.response.data?.error || 
  //                      `Server error: ${error.response.status}`;
  //       } else if (error.request) {
  //         errorMessage = "No response from server - check your connection";
  //       }
    
  //       toast.error(errorMessage);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   console.log("Access Token:", access_token); // Debug token
  //   console.log("Request Payload:", { title, des, banner, content, tags, draft: false }); // Debug payload

  //   if (!access_token) {
  //     toast.error("Authentication required");
  //     navigate("/login");
  //     return;
  //   }
  //   if (e.target.className.includes("disable")) {
  //     return;
  //   }
  //   // const formattedContent = {
  //   //   blocks: Array.isArray(content) ? content : []
  //   // };
  //   if (!title.length) {
  //     return toast.error("Write blog title before publishing");
  //   }

  //   if (!des.length || des.length > characterLimit) {
  //     return toast.error(`Write a description about your blog within ${characterLimit} characters to publish`);
  //   }

  //   if (!tags.length) {
  //     return toast.error("Enter at least 1 tag to help us rank your blog");
  //   }

  //   let loadingToast = toast.loading("Publishing....");

  //   e.target.classList.add("disable");

  //   const validatedContent = blog.content?.blocks ?
  //     blog.content :
  //     { blocks: Array.isArray(blog.content) ? blog.content : [] };

  //   let blogObj = {
  //     title,
  //     banner,
  //     des,
  //     content: validatedContent,
  //     tags,
  //     draft: false
  //   };
  //   console.log("Sending request with:", {
  //     url: import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",
  //     data: blogObj,
  //     headers: {
  //       Authorization: `Bearer ${access_token?.substring(0, 10)}...`
  //     }
  //   });

  //   axios.post(
  //     import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",
  //     blogObj,
  //     {
  //       headers: {
  //         'Authorization': `Bearer ${access_token}`
  //       }
  //     }
  //   )
  //     .then(() => {
  //       e.target.classList.remove("disable");
  //       toast.dismiss(loadingToast);
  //       toast.success("Published 👍");
  //       setTimeout(() => navigate("/"), 1500);
  //     })
  //     .catch((error) => {
  //       e.target.classList.remove("disable");
  //       toast.dismiss(loadingToast);

  //       // Enhanced error handling
  //       const errorMessage = error.response?.data?.error ||
  //         error.message ||
  //         "Failed to publish blog";

  //       console.error("Publish error:", {
  //         error: error,
  //         response: error.response,
  //         request: error.request
  //       });

  //       toast.error(errorMessage);
  //     });
  // }
  const publishBlog = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Get access token from session
    const userAuth = JSON.parse(lookInSession("user") || "{}");
    const access_token = userAuth.access_token;

    if (!access_token) {
      toast.error("Authentication required");
      navigate("/login");
      setIsLoading(false);
      return;
    }

    // Validate required fields
    if (!blog.title?.trim()) {
      toast.error("Write blog title before publishing");
      setIsLoading(false);
      return;
    }

    if (!blog.des?.trim() || blog.des.length > characterLimit) {
      toast.error(`Write a description about your blog within ${characterLimit} characters`);
      setIsLoading(false);
      return;
    }

    if (!blog.tags?.length) {
      toast.error("Enter at least 1 tag to help us rank your blog");
      setIsLoading(false);
      return;
    }

    // Validate EditorJS content
    if (!blog.content?.blocks || !Array.isArray(blog.content.blocks)) {
      toast.error("Invalid content format - please edit your content");
      setIsLoading(false);
      return;
    }

    const loadingToast = toast.loading("Publishing...");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_DOMAIN}/create-blog`,
        {
          title: blog.title,
          des: blog.des,
          banner: blog.banner,
          content: blog.content,
          tags: blog.tags.map(tag => tag.trim().toLowerCase()),
          draft: false
        },
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      toast.dismiss(loadingToast);
      toast.success("Published successfully!");
      sessionStorage.removeItem("blog_draft");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Publish error:", error);
      
      let errorMessage = "Failed to publish";
      if (error.response) {
        errorMessage = error.response.data?.error || 
                     `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response from server - check your connection";
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleCloseEvent = () => {
    setEditorState("editor");
    navigate("/editor");
  };

  const handleBlogTitleChange = (e) => {
    setBlog({ ...blog, title: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setBlog({ ...blog, des: e.target.value });
  };

  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (tags.length >= 5) {
        toast.error("Maximum 5 tags allowed");
        return;
      }
      if (!tags.includes(tagInput.trim())) {
        const newTags = [...tags, tagInput.trim()];
        setTags(newTags);
        setBlog({ ...blog, tags: newTags });
        setTagInput("");
      }
    }
  };

  const removeTag = (tag) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    setBlog({ ...blog, tags: newTags });
  };

  if (!blog?.banner) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <AnimationWrapper>
      <section className="w-full min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
        <Toaster />
        <button
          className="fixed top-4 right-4 z-50 bg-red-500 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center hover:bg-red-600 transition border-2 border-red-600"
          onClick={handleCloseEvent}
          disabled={isLoading}
          aria-label="Close publish form"
        >
          <span className="text-lg sm:text-xl">X</span>
        </button>

        <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">
          {/* Preview Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Preview</h2>
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={blog.banner}
                alt="Blog banner"
                className="w-full h-full object-cover"
                onError={(e) => (e.target.src = "/imgs/blog banner.png")}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-4 text-gray-900 line-clamp-2">
              {blog.title || "Untitled Blog"}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mt-2 line-clamp-3">
              {blog.des || "No description provided"}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 text-sm sm:text-base font-medium px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Blog Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Blog Title
                </label>
                <input
                  type="text"
                  placeholder="Enter blog title"
                  value={blog.title || ""}
                  onChange={handleBlogTitleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Write a short description"
                  value={blog.des || ""}
                  onChange={handleDescriptionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 sm:h-32 resize-none text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">
                  Tags (Press Enter to add, max 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center bg-gray-100 text-gray-800 text-sm sm:text-base px-3 py-1 rounded-full"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        disabled={isLoading}
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagKeyDown}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={publishBlog}
                className={`w-full py-3 rounded-lg text-white font-semibold text-sm sm:text-base ${isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                  } transition`}
                disabled={isLoading}
              >
                {isLoading ? "Publishing..." : "Publish Blog"}
              </button>
              <button className="btn-dark px-8" onClick={publishBlog}>Publish</button>
            </div>
          </div>
        </div>
      </section>
    </AnimationWrapper>
  );
};

export default PublishForm;