// @ts-nocheck
import { createContext, useContext, useState, ReactNode } from "react";

interface DecryptedDataContextType {
  data: unknown | null;
  setDecryptedData: (data: unknown) => void;
}

const DecryptedDataContext = createContext<
  DecryptedDataContextType | undefined
>(undefined);

export const DecryptedDataProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [data, setData] = useState<unknown | null>(
    window.DECRYPTED_DATA || null,
  );

  const setDecryptedData = (newData: unknown) => {
    setData(newData);
    window.DECRYPTED_DATA = newData;
  };

  return (
    <DecryptedDataContext.Provider value={{ data, setDecryptedData }}>
      {children}
    </DecryptedDataContext.Provider>
  );
};

export const useDecryptedData = () => {
  const context = useContext(DecryptedDataContext);
  if (!context) {
    throw new Error(
      "useDecryptedData must be used within a DecryptedDataProvider",
    );
  }
  return context;
};

