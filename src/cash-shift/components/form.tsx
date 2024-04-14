"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function Form() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          ＋
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form id="gategory-form">
            <DialogHeader>
              <DialogTitle>Agregar categoría</DialogTitle>
              <DialogDescription>
                Categoriza tus productos para una mejor organización.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Input
                          id="category"
                          placeholder="Nombre de categoría..."
                          className="col-span-4"
                          {...field}
                        />
                        <FormMessage className="col-span-4" />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              {
                // button submit form
              }
              <Button
                type="button"
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
              >
                Agregar categoría
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
