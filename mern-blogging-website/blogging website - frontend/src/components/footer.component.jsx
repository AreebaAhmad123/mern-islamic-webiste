import React, { useState } from 'react';
import blogBanner from '../imgs/blog banner.png';
import userProfile from '../imgs/user profile.png';
import logo from '../imgs/logo.png';
import fullLogo from '../imgs/full-logo.png';
import google from '../imgs/google.png';
import notFound from '../imgs/404.png';
import axios from 'axios';

const defaultInstagramImages = [
  blogBanner,
  userProfile,
  logo,
  fullLogo,
  google,
  notFound,
  blogBanner,
  userProfile,
  logo,
];

const Footer = ({ instagramImages, recentComments, categories }) => {
  const images = instagramImages && instagramImages.length > 0 ? instagramImages : defaultInstagramImages;
  const comments = (recentComments && recentComments.length > 0 ? recentComments : [
    { commented_by: { personal_info: { fullname: "Ellismatrix" } }, comment: "Wow Nice Docs This Look 🔥 Great! It Should Be Delicious. Thanks" },
    { commented_by: { personal_info: { fullname: "Cassia" } }, comment: "Top & Best, I'll Be Cheer Up You Again In Next Game Go Go 👏" },
    { commented_by: { personal_info: { fullname: "Amanda" } }, comment: "You Were So Amazing Today, Love! 💖 Great Match" },
    { commented_by: { personal_info: { fullname: "Denis Simonassi" } }, comment: "It Was a Great Match Today Jane! You Did Great 🏆" },
  ]).slice(0, 4); // Show only 4 comments
  const categoryList = categories && categories.length > 0 ? categories : [
    "Culture", "Fashion", "Food", "Healthy Living", "Technology"
  ];

  // Helper to truncate comment to 10-15 words
  const truncateWords = (str, num = 15) => {
    if (!str) return "";
    const words = str.split(" ");
    if (words.length <= num) return str;
    return words.slice(0, num).join(" ") + "...";
  };

  // Newsletter state
  const [email, setEmail] = useState("");
  const [newsletterMsg, setNewsletterMsg] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setNewsletterMsg("");
    setNewsletterStatus("");
    setLoading(true);
    try {
      const res = await axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/subscribe-newsletter",
        { email }
      );
      setNewsletterMsg(res.data.message || "Subscribed successfully!");
      setNewsletterStatus("success");
      setEmail("");
    } catch (err) {
      setNewsletterMsg(
        err.response?.data?.error || "Failed to subscribe. Please try again."
      );
      setNewsletterStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full pt-4 pb-0 pr-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 ">
        {/* Left 2 columns: Mega News + Newsletters + Categories + Social Network */}
        <div className='bg-grey rounded-r-xl px-4' >
        <div className="flex flex-col sm:flex-row gap-4 bg-gray-100 px-6 rounded-3xl p-4 pb-2 shadow-md max-w-xl mx-auto">
          {/* Mega News + Newsletters */}
          <div className="flex-1 min-w-[180px]">
            <h3 className="font-semibold text-base mb-1 flex items-center gap-1"><span className="text-yellow-400 text-lg">•</span> Mega News</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-2 text-justify">
              Lorem Ipsum Dolor Sit Amet, Consectetur Adipisicing Elit, Sed Do Eiusmod Tempor Incididunt Ut Labore Et Dolore Magna Aliqua. Egestas Purus Viverra Accumsan In Nisi Nisi. Arcu Cursus Vitae Congue Mauris Rhoncus Aenean Vel Elit Scelerisque. In Egestas Erat Imperdiet Sed Euismod Nisi Porta Lorem Molla. Morbi Tristique Senectus Et Netus. Mattis Pellentesque Id Nibh Tortor Id Aliquet Lectus Proin
            </p>
            <h3 className="font-semibold text-base mb-1 flex items-center gap-1 mt-6"><span className="text-yellow-400 text-lg">•</span> Newsletters</h3>
            <form onSubmit={handleNewsletterSubmit} className="flex items-center border rounded-md overflow-hidden w-full max-w-xs bg-white">
              <input
                type="email"
                placeholder="Write Your Email .."
                className="flex-1 px-2 py-2 bg-transparent outline-none"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-white px-2 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                ) : (
                  <i className="fi fi-rr-envelope"></i>
                )}
              </button>
            </form>
            {newsletterMsg && (
              <div className={`mt-2 text-xs ${newsletterStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>{newsletterMsg}</div>
            )}
          </div>
          {/* Categories + Social Network */}
          
          <div className="flex-1 min-w-[100px] max-auto">
            <h3 className="font-semibold text-base mb-1 flex items-center gap-1"><span className="text-yellow-400 text-lg">•</span> Categories</h3>
            <ul
              className="text-xs text-gray-500 space-y-1 pl-2 mb-2"
              style={{ maxHeight: '7.5em', overflowY: 'auto' }} // 5 lines at 1.5em each
            >
              {categoryList.map((cat, idx) => (
                <li key={idx}>{cat}</li>
              ))}
            </ul>
            <h3 className="font-semibold text-base mb-1 flex items-center gap-1 mt-2 whitespace-nowrap"><span className="text-yellow-400 text-lg">•</span> Social Network</h3>
            <div className="flex gap-2 mt-2">
              <a href="#" className="flex items-center gap-1 px-2 py-1 bg-pink-500 text-white rounded-md text-xs hover:bg-pink-600 transition"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.241-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.425 3.678 1.406 2.697 2.387 2.403 3.499 2.344 4.78.013 8.332 0 8.741 0 12c0 3.259.013 3.668.072 4.948.059 1.281.353 2.393 1.334 3.374.981.981 2.093 1.275 3.374 1.334C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.281-.059 2.393-.353 3.374-1.334.981-.981 1.275-2.093 1.334-3.374.059-1.28.072-1.689.072-4.948s-.013-3.668-.072-4.948c-.059-1.281-.353-2.393-1.334-3.374-.981-.981-2.093-1.275-3.374-1.334C15.668.013 15.259 0 12 0z"/><path d="M12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg> Instagram</a>
              <a href="#" className="flex items-center gap-1 px-2 py-1 bg-blue-400 text-white rounded-md text-xs hover:bg-blue-500 transition"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195a4.92 4.92 0 0 0-8.384 4.482C7.691 8.095 4.066 6.13 1.64 3.161c-.542.929-.856 2.01-.857 3.17 0 2.188 1.115 4.117 2.823 5.254a4.904 4.904 0 0 1-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 0 1-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.21-.005-.423-.014-.634A9.936 9.936 0 0 0 24 4.557z"/></svg></a>
            </div>
          </div>
    
        </div>
        <div className="w-full bg-gray-300 py-2 mt-2 rounded-b-3xl px-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
              <span>Privacy Policy | Terms & Conditions</span>
              <span>All Copyright (C) 2022 Reserved</span>
            </div>
            </div>
        {/* New Comments */}
        <div className="flex-1 max-w-xs bg-gray-200 rounded-3xl p-4 flex flex-col gap-2 shadow-md">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-1"><span className="text-yellow-400 text-lg">•</span> New Comments</h3>
          <div className="flex flex-col gap-2">
            {comments.map((c, idx) => (
              <div key={idx} className="bg-white rounded-lg p-1.5 text-xs shadow-sm min-h-0">
                <span className="font-semibold text-gray-700 block leading-tight mb-0.5">{c.commented_by?.personal_info?.fullname || "User"}</span>
                <span className="text-gray-500 block leading-tight">{truncateWords(c.comment, 15)}</span>
              </div>
            ))}
          </div>
          
        </div>
        {/* Instagram */}
        <div className="flex-1 max-w-xs flex flex-col">
          <h3 className="font-semibold text-base mb-3 flex items-center gap-1"><span className="text-yellow-400 text-lg">•</span> Follow On Instagram</h3>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {images.slice(0, 9).map((img, idx) => (
              <img key={idx} src={img} alt="Instagram post" className="w-20 h-20 object-cover rounded-md border border-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer; 