import React from "react";
import Button from "./Button";

export interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#2b2b2b",
          padding: "1.5rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "400px",
          color: "#f5f5f5",
        }}
      >
        <p style={{ marginBottom: "1rem" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <Button variant="success" onClick={onConfirm}>
            Confirmer
          </Button>
          <Button variant="danger" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;