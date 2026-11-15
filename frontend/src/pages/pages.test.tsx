import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../i18n";
import { AuthProvider } from "../lib/auth";
import { Login, OfficerLogin } from "./Auth";
import Landing from "./Landing";

const wrap = (ui: React.ReactNode) => render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter></QueryClientProvider>);

describe("Landing", () => {
  it("shows the headline, honest limits and demo-data label", () => {
    wrap(<Landing />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Prove crop loss in minutes/);
    expect(screen.getByText(/What KisanClaim does not claim/)).toBeInTheDocument();
    expect(screen.getByText(/Illustrative sample data, not a measured result/)).toBeInTheDocument();
  });
  it("moves the NDVI slider", () => {
    wrap(<Landing />);
    const s = screen.getByLabelText(/Drag through the weeks/) as HTMLInputElement;
    fireEvent.change(s, { target: { value: "5" } });
    expect(screen.getByText(/after the flood/)).toBeInTheDocument();
  });
});

describe("Farmer Voice & OTP Authentication", () => {
  it("renders farmer name input, mobile input, voice toggles and demo farmer button", () => {
    wrap(<Login />);
    expect(screen.getByLabelText(/ರೈತರ ಹೆಸರು/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ಮೊಬೈಲ್ ಸಂಖ್ಯೆ/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ಧ್ವನಿ ಮೂಲಕ ಲಾಗಿನ್/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ramesh Kumar/ })).toBeInTheDocument();
    expect(screen.getByTitle(/ಧ್ವನಿ ಮೂಲಕ ಹೆಸರು/)).toBeInTheDocument();
    expect(screen.getByTitle(/ಧ್ವನಿ ಮೂಲಕ ಮೊಬೈಲ್/)).toBeInTheDocument();
  });

  it("supports manual entry for name and phone", () => {
    wrap(<Login />);
    const nameInput = screen.getByLabelText(/ರೈತರ ಹೆಸರು/) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/ಮೊಬೈಲ್ ಸಂಖ್ಯೆ/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Suresh Gowda" } });
    fireEvent.change(phoneInput, { target: { value: "9845012345" } });
    expect(nameInput.value).toBe("Suresh Gowda");
    expect(phoneInput.value).toBe("9845012345");
  });
});

describe("Officer / Insurer Login", () => {
  it("renders email and password inputs with role quick-fill buttons", () => {
    wrap(<OfficerLogin />);
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Fill Officer\/Insurer/i })).toBeInTheDocument();
  });
});
