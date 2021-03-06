import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { secret } from "../constants";
import User from "../models/User";
import { UserInputError } from "apollo-server-express";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../../utils/validators";

export const UserResolvers = {
  Query: {
    getUsers: async () => {
      try {
        const users = await User.find();
        return users;
      } catch (err) {
        throw new Error(err);
      }
    },
  },
  Mutation: {
    createUser: async (_, { username, email, password, confirmPassword }) => {
      // Validate user input
      const { valid, errors } = validateRegisterInput(
        username,
        email,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      // Check if user already exists or not
      const user1 = await User.findOne({ username });
      if (user1) {
        throw new UserInputError("Username is already taken", {
          errors: {
            username: "This username is taken",
          },
        });
      }

      // Check if email has been usen or not
      const user2 = await User.findOne({ email });
      if (user2) {
        throw new UserInputError("Email is already taken", {
          errors: {
            email: "This email is taken",
          },
        });
      }

      // Encrypt the password
      password = await bcrypt.hash(password, 12);

      const newUser = new User({
        username,
        email,
        password,
        createdAt: new Date(),
      });

      const res = await newUser.save();

      // Authentication token
      const token = jwt.sign(
        {
          id: res.id,
          email: res.email,
          username: res.username,
        },
        secret,
        { expiresIn: "1h" }
      );
      console.log(newUser);

      return {
        ...res._doc,
        id: res.id,
        token,
      };
    },
    login: async (_, { username, password }) => {
      // Validate user input
      const { errors, valid } = validateLoginInput(username, password);
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      // Check if username exists
      const user = await User.findOne({ username });
      if (!user) {
        errors.username = "User not found";
        throw new UserInputError("User not found", { errors });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        errors.password = "Wrong password";
        throw new UserInputError("Wrong password", { errors });
      }

      // Authentication token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        secret,
        { expiresIn: "1h" }
      );

      return {
        ...user._doc,
        id: user.id,
        token,
      };
    },
  },
};
