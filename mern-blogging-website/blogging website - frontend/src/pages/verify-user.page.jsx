import { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { UserContext } from "../App";
import { updateUserAuth } from "../common/auth";

const VerifyUserPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserAuth } = useContext(UserContext);
  const [status, setStatus] = useState("Verifying your email...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("");
      setError("Invalid verification link.");
      return;
    }
    axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/api/verify-user?token=${token}`)
      .then(async ({ data }) => {
        console.log('Verification response:', data);
        if (data.access_token) {
          setStatus("Email verified! Logging you in...");
          // Store JWT and user info for auto-login
          updateUserAuth({
            access_token: data.access_token,
            ...data.user
          }, setUserAuth);
          console.log("updateUserAuth called with:", {
            access_token: data.access_token,
            ...data.user
          });
          toast.success("Email verified! You are now logged in.");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else if (data.message) {
          setStatus(data.message);
          toast.success(data.message);
        } else {
          setStatus("");
          setError("Verification failed.");
        }
      })
      .catch((error) => {
        setStatus("");
        setError(error?.response?.data?.error || "Verification failed.");
      });
  }, [searchParams, navigate, setUserAuth]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Email Verification</h2>
        {status && <p className="text-green-700 mb-2">{status}</p>}
        {error && <p className="text-red-600 mb-2">{error}</p>}
      </div>
    </div>
  );
};

export default VerifyUserPage; 