import { useNavigate } from "react-router-dom";
import defaultBanner from "../imgs/blog banner.png";
import AnimationWrapper from "../common/page-animation";
import EditorJS from "@editorjs/editorjs";
import { useEffect, useState, useContext } from "react";
import { Toaster, toast } from "react-hot-toast";
import { tools } from "./tools.component";
import { EditorContext } from "../App";
import axios from "axios";
import { lookInSession } from "../common/session";

const BlogEditor = () => {
  const { blog, setBlog, setEditorState } = useContext(EditorContext);
  const [title, setTitle] = useState("");
  const [banner, setBanner] = useState("");
  const [des, setDes] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [textEditor, setTextEditor] = useState(null);
  const navigate = useNavigate();
  const userAuth = JSON.parse(lookInSession("user") || "{}");
  const access_token = userAuth.access_token || null;

  if (!access_token) {
    toast.error("Authentication required. Please log in.");
    navigate("/login");
    return null;
  }

  useEffect(() => {
    const draft = JSON.parse(sessionStorage.getItem("blog_draft") || "{}");
    const storedBanner = sessionStorage.getItem("uploaded_banner_base64") || "";
    setTitle(draft.title || "");
    setBanner(draft.banner || storedBanner || "");
    setDes(draft.des || "");
    setTags(draft.tags || []);
    setBlog({
      title: draft.title || "",
      banner: draft.banner || storedBanner || "",
      content: draft.content || { blocks: [] },
      tags: draft.tags || [],
      des: draft.des || "",
      author: draft.author || { personal_info: {} },
    });

    const editor = new EditorJS({
      holderId: "textEditor",
      data: draft.content || { blocks: [] },
      tools: tools,
      placeholder: "Let's write an awesome story",
    });

    setTextEditor(editor);

    return () => {
      editor.isReady.then(() => editor.destroy()).catch(() => { });
    };
  }, [setBlog]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (textEditor) {
        textEditor.save().then((data) => {
          const blogData = { title, banner, content: data, tags, des };
          localStorage.setItem("blog_draft", JSON.stringify(blogData));
          setBlog(blogData);
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [title, banner, des, tags, textEditor, setBlog]);

  useEffect(() => {
    const saveDraft = () => {
      if (textEditor) {
        textEditor.save().then((data) => {
          const blogData = { title, banner, content: data, tags, des };
          sessionStorage.setItem("blog_draft", JSON.stringify(blogData));

        });
      }
    };

    window.addEventListener("beforeunload", saveDraft);
    return () => window.removeEventListener("beforeunload", saveDraft);
  }, [title, banner, des, tags, textEditor, setBlog]);

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setBanner(base64);
      sessionStorage.setItem("uploaded_banner_base64", base64);
      setBlog({ ...blog, banner: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setBlog({ ...blog, title: e.target.value });
  };

  const handleDescriptionChange = (e) => {
    setDes(e.target.value);
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

  const handleTitleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
    }
  };

  const handleError = (e) => {
    e.target.src = defaultBanner;
  };

  const handleSaveDraft = (e) => {
    if (e.target.className.includes("disable")) {
      return;
    }

    if (!title.length) {
      return toast.error("Write blog title before saving it as a draft");
    }

    let loadingToast = toast.loading("Saving draft....");

    e.target.classList.add("disable");
    if (textEditor.isReady) {
      textEditor.save().then(content => {
        let blogObj = {
          title, banner, des, content, tags, draft: true
        };

        axios.post(
          import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",
          blogObj,
          {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }
        )
          .then(() => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            toast.success("Saved 👍");
            setTimeout(() => {
              navigate("/");
            }, 500);
          })
          .catch(({ response }) => {
            e.target.classList.remove("disable");
            toast.dismiss(loadingToast);
            toast.error(response.data.error);
          });
      });
    }
  };

  const handlePublishEvent = async () => {
    if (!banner) {
      return toast.error("Upload a blog banner to publish it");
    }
    if (!title) {
      return toast.error("Write blog title to publish it");
    }
    if (!des) {
      return toast.error("Write blog description to publish it");
    }

    if (textEditor?.isReady) {
      try {
        const data = await textEditor.save();
        console.log("EditorJS content:", data);
        if (!data.blocks?.length) {
          return toast.error("Write something in your blog to publish it");
        }

        const blogData = { title, banner, content: data, tags, des };
        console.log("Blog data before publish:", blogData);
        setBlog(blogData);
        setEditorState("publish");
        sessionStorage.setItem("blog_draft", JSON.stringify(blogData));
        navigate("/publish-form");
      } catch (err) {
        console.error("EditorJS save error:", err);
        toast.error("Failed to save blog content");
      }
    }
  };

  return (
    <>
      <nav className="navbar"></nav>
      <Toaster />
      <AnimationWrapper>
        <section className="w-full py-8 px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6 sm:mb-8 ml-28">
            <button
              className="btn-dark py-2 hidden md:block text-sm sm:text-base"
              onClick={handleSaveDraft}
            >
              Save Draft
            </button>
            <button
              className="btn-light py-2 hidden md:block text-sm sm:text-base"
              onClick={handlePublishEvent}
            >
              Publish
            </button>
          </div>

          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video hover:opacity-80 bg-white border-l border-gray-200 rounded-lg">
              <label htmlFor="uploadBanner">
                <img
                  src={banner || defaultBanner}
                  className="w-full h-full object-cover rounded-lg"
                  onError={handleError}
                />
                <input
                  id="uploadBanner"
                  type="file"
                  accept=".png, .jpg, .jpeg"
                  hidden
                  onChange={handleBannerUpload}
                />
              </label>
            </div>

            <textarea
              value={title}
              placeholder="Blog Title"
              className="text-3xl sm:text-4xl font-medium w-full h-20 outline-none resize-none mt-6 sm:mt-10 leading-tight placeholder:opacity-40"
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
            />

            <textarea
              value={des}
              placeholder="Blog Description"
              className="text-base sm:text-lg w-full h-20 outline-none resize-none mt-4 leading-tight placeholder:opacity-40"
              onChange={handleDescriptionChange}
            />

            <div className="mt-4">
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
              />
            </div>

            <hr className="w-full opacity-10 my-5" />

            <div id="textEditor" className="font-gelasio min-h-[300px]"></div>
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
};

export default BlogEditor;