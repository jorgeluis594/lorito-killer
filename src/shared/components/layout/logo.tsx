"use client";
import {useEffect, useState} from "react";
import {Company} from "@/company/types";
import {getCompany} from "@/order/actions";
import Image from "next/image";
import {useLogoStore} from "@/company/logo-store-provider";
import {getLogo} from "@/company/components/actions";

export function LogoImage() {

  return (
    <>
      <Image fill className="object-cover" alt="Image" src=""/>
    </>
  );
}
