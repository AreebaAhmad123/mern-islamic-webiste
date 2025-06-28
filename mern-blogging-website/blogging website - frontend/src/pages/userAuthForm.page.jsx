import InputBox from "../components/input.component";
import { useRef, useContext } from "react";
import googleIcon from "../imgs/google.png";
import { Link, Navigate } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";
import { storeInSession } from "../common/session";
import { UserContext } from "../App";

const UserAuthForm = ({ type }) => {
  let { userAuth, setUserAuth } = useContext(UserContext);
  const access_token = userAuth?.access_token;

  console.log("Current access_token:", access_token);

  const userAuththroughServer = (serverRoute, formData) => {
    console.log("Sending request to:", import.meta.env.VITE_SERVER_DOMAIN + serverRoute);
    console.log("Form data:", formData);
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute, formData)
      .then(({ data }) => {
        console.log("Server response:", data);
        storeInSession("user", JSON.stringify(data));
        console.log("Stored in sessionStorage:", sessionStorage.getItem("user"));
        setUserAuth(data);
      })
      .catch(({ response }) => {
        console.error("Error response:", response?.data);
        toast.error(response.data.error);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let serverRoute = type === "login" ? "/login" : "/signup";
    let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

    let formElement = document.getElementById("formElement");
    if (!formElement) {
      console.error("Form element is not found");
      return;
    }
    let form = new FormData(formElement);
    let formData = {};

    for (let [key, value] of form.entries()) {
      formData[key] = value;
    }
    let { firstname, lastname, email, password } = formData;

    if (type !== "login") {
      if (!firstname || firstname.length < 1) {
        return toast.error("First name must be at least 1 letter long");
      }
      if (!lastname || lastname.length < 1) {
        return toast.error("Last name must be at least 1 letter long");
      }
      if ((firstname + ' ' + lastname).trim().length < 3) {
        return toast.error("Fullname must be at least 3 letters long");
      }
    }
    if (!email.length) {
      return toast.error("Enter Email");
    }
    if (!emailRegex.test(email)) {
      return toast.error("Email is invalid");
    }
    if (!passwordRegex.test(password)) {
      return toast.error("Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letter");
    }
    userAuththroughServer(serverRoute, formData);
  };

  return (
    access_token ? <Navigate to="/" /> :
      <AnimationWrapper keyValue={type}>
        <section className="h-cover flex items-center justify-center">
          <Toaster />
          <form id="formElement" className="w-[80%] max-w-[400px]" onSubmit={handleSubmit}>
            <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
              {type === "login" ? "Welcome back" : "Join us today"}
            </h1>
            {type !== "login" ? (
              <>
                <InputBox name="firstname" type="text" placeholder="First Name" icon="fi-rr-user" />
                <InputBox name="lastname" type="text" placeholder="Last Name" icon="fi-rr-user" />
              </>
            ) : ""}
            <InputBox name="email" type="email" placeholder="Email" icon="fi-rr-envelope" />
            <InputBox name="password" type="password" placeholder="Password" icon="fi-rr-key" />
            <button className="btn-dark center w-[100%] mt-14 ml-3" type="submit">
              {type === "signup" ? "Sign Up" : "Login"}
            </button>
            <div className="relative w-full flex items-center gap-2 my-10 opacity-10 uppercase text-black font-bold">
              <hr className="w-1/2 border-black" />
              <p>or</p>
              <hr className="w-1/2 border-black " />
            </div>
            <button className="btn-dark flex items-center justify-center gap-4 w-[100%] center ml-3">
              <img src={googleIcon} className="w-5" />
              Continue with google
            </button>
            {type === "login" ? (
              <p className="mt-6 text-dark-grey text-xl text-center">
                Don't have an account?
                <Link to="/signup" className="underline text-black text-xl ml-1">
                  Join us today
                </Link>
              </p>
            ) : (
              <p className="mt-6 text-dark-grey text-xl text-center">
                Already a member?
                <Link to="/login" className="underline text-black text-xl ml-1">
                  Sign in here.
                </Link>
              </p>
            )}
          </form>
        </section>
      </AnimationWrapper>
  );
};

export default UserAuthForm;