import React from "react";
import { FiUser, FiUserCheck } from "react-icons/fi";
import { HiUser } from "react-icons/hi";

const GenderIcon = ({ gender }) => {
  if (!gender) {
    return <FiUser className="gender-icon" title="Unknown" />;
  }

  const genderLower = gender.toLowerCase();

  if (genderLower === "male" || genderLower === "m") {
    return <FiUser className="gender-icon gender-male" title="Male" />;
  } else if (genderLower === "female" || genderLower === "f") {
    return <FiUserCheck className="gender-icon gender-female" title="Female" />;
  } else if (genderLower === "child" || genderLower === "c") {
    return <HiUser className="gender-icon gender-child" title="Child" />;
  }

  return <FiUser className="gender-icon" title="Unknown" />;
};

export default GenderIcon;
