import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { useNavigate } from "react-router-dom";

export const useSignupNavigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const goToSignup = useCallback(() => {
    if (user?.email) {
      navigate("/signup?skipOnboarding=true");
    } else {
      navigate("/signup");
    }
  }, [user?.email, navigate]);

  return { goToSignup, isLoggedIn: !!user?.email };
};
