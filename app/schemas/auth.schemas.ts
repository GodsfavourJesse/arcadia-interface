import { z } from "zod";

export const signupSchema = z.object({
    displayName: z
        .string()
        .trim()
        .min(
            1,
            "Display name is required",
        )
        .max(
            100,
            "Display name must be at most 100 characters",
        ),

    username: z
        .string()
        .trim()
        .min(
            3,
            "Username must be at least 3 characters",
        )
        .max(
            30,
            "Username must be at most 30 characters",
        )
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can contain only letters, numbers, and underscores",
        )
        .transform((value) =>
            value.toLowerCase(),
        ),

    email: z
        .string()
        .trim()
        .email(
            "Enter a valid email address",
        )
        .max(255),

    password: z
        .string()
        .min(
            8,
            "Password must be at least 8 characters",
        )
        .max(
            128,
            "Password must be at most 128 characters",
        ),
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email(
            "Enter a valid email address",
        )
        .max(255),

    password: z
        .string()
        .min(
            1,
            "Password is required",
        )
        .max(128),
});

export const verificationTokenSchema =
    z.object({
        token: z
            .string()
            .trim()
            .min(
                1,
                "Verification token is required",
            ),
    });

export const profileUpdateSchema = z.object({
    displayName: z
        .string()
        .trim()
        .min(
            1,
            "Display name is required",
        )
        .max(
            100,
            "Display name must be at most 100 characters",
        ),

    bio: z
        .string()
        .trim()
        .max(
            500,
            "Bio must be at most 500 characters",
        )
        .nullable(),

    profilePictureUrl: z
        .string()
        .trim()
        .url(
            "Enter a valid profile picture URL",
        )
        .max(500)
        .nullable(),
});

export type SignupFormValues =
    z.input<typeof signupSchema>;

export type LoginFormValues =
    z.input<typeof loginSchema>;