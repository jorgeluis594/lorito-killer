import { response } from "@/lib/types";
import { Company, Logo } from "./types";
import prisma from "@/lib/prisma";

type logoApi = Omit<Logo, "createdAt"> & { createdAt: string };

export const storeLogos = async (
    companyId: string,
    logos: Logo[],
): Promise<response<Logo[]>> => {
    const res = await fetch(`/api/companies/${companyId}/logos`, {
        method: "POST",
        body: JSON.stringify(logos),
        headers: {
            "Content-Type": "application/json",
        },
    });

    const storeLogoResponse: response<logoApi[]> = await res.json();
    if (!storeLogoResponse.success) {
        return storeLogoResponse;
    }

    const storedLogos: Logo[] = storeLogoResponse.data.map((logo) => ({
        ...logo,
        createdAt: new Date(logo.createdAt),
    }));

    return { success: true, data: storedLogos };
};

export const removeLogo = async (
    companyId: string,
    logoId: string,
): Promise<response<Logo>> => {
    const res = await fetch(`/api/companies/${companyId}/photos/${logoId}`, {
        method: "DELETE",
    });

    return await res.json();
};