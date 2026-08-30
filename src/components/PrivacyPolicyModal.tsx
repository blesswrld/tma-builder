import React from "react";
import { LegalCenterModal, LegalDocType } from "./LegalCenterModal";

export interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName?: string;
  shopSlug?: string;
  source?: "admin" | "shop";
  initialDoc?: LegalDocType;
  shopData?: {
    legalName?: string;
    inn?: string;
    ogrn?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = (props) => {
  return <LegalCenterModal {...props} />;
};
