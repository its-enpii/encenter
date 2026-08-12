"use client";

import React from "react";
import { useParams } from "next/navigation";
import ConnectPage from "../../connect/page";

export default function ServerConsolePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return <ConnectPage serverIdParam={id} />;
}
