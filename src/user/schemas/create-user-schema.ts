import * as z from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default CreateUserSchema;
