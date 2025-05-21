import { Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar.component";
import UserAuthForm from "./pages/userAuthForm.page";
import { createContext, useState } from "react";
import Editor from "./pages/editor.pages";
import PublishForm from "./components/publish-form.component";
import HomePage from "./pages/home.page";
import { lookInSession } from "./common/session";
import SearchPage from "./pages/search.page"
import PageNotFound from "./pages/404.page"
import ProfilePage from "./pages/profile.page"
import Blogpage from "./pages/blog.page"


export const userContext = createContext({});
export const EditorContext = createContext({});

const blogStructure = {
  title: "",
  banner: "",
  content: { blocks: [] }, // Ensure proper structure
  tags: [],
  des: "",
  author: { personal_info: {} }
};

const App = () => {
  const [userAuth, setUserAuth] = useState(() => {
    const savedAuth = lookInSession("user");
    return savedAuth ? JSON.parse(savedAuth) : { access_token: null };
  });

  const [blog, setBlog] = useState(blogStructure);
  const [editorState, setEditorState] = useState("editor");
  const [textEditor, setTextEditor] = useState({ isReady: false });

  return (
    <userContext.Provider value={{ userAuth, setUserAuth }}>
      <EditorContext.Provider
        value={{ blog, setBlog, editorState, setEditorState, textEditor, setTextEditor }}
      >
        <Routes>
          <Route path="/" element={<Navbar />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<UserAuthForm type="login" />} />
            <Route path="signup" element={<UserAuthForm type="signup" />} />
            <Route path="categories" element={<h1>Categories Page</h1>} />
            <Route path="pages" element={<h1>Pages</h1>} />
            <Route path="contact" element={<h1>Contact Page</h1>} />
            <Route path="about" element={<h1>About Page</h1>} />
            <Route path="editor" element={<Editor />} />
            <Route path="editor/:blog_id" element={<Editor/>}/>
            <Route path="publish-form" element={<PublishForm />} />
            <Route path="search/:query" element={<SearchPage/>}/>
            <Route path="user/:id" element={<ProfilePage/>}/>
            <Route path="blog/:blog_id" element={<Blogpage/>}/>
            <Route path="*" element={<PageNotFound/>}/>
          </Route>
        </Routes>
      </EditorContext.Provider>
    </userContext.Provider>
  );
};

export default App;