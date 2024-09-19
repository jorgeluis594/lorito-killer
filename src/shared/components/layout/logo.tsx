"use client";
import {useEffect, useState} from "react";
import {Company} from "@/company/types";
import {getCompany} from "@/order/actions";
import Image from "next/image";
import {useLogoStore} from "@/company/logo-store-provider";
import {getLogo} from "@/company/components/actions";

export function LogoImage() {
  const {setLogos} = useLogoStore((store) => store);
  const logos = useLogoStore((store) => store.logos)
  const logourl = logos[0]?.url || ""

  const fetchLogos = async () => {
    const company = await getCompany();
    if (company.success) {
      const response = await getLogo(company.data.id);
      if (response.success) {
        setLogos(response.data);
      }
    }
  };

  useEffect(() => {
    fetchLogos();
  }, []);
  console.log(logourl)

  return (
    <>
      <Image fill className="object-cover" alt="Image" src={logourl}/>
    </>
  );
}
