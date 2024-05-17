import BreadCrumb from "@/shared/breadcrumb";
import ListCategories from "@/category/components/category-modal/category";

const breadcrumbItems = [{ title: "Categorias", link: "/categories" }];

export default async function Page() {
  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />
      <ListCategories />
    </div>
  )
}
