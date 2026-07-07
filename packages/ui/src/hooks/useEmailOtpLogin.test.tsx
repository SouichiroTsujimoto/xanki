import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useEmailOtpLogin } from "./useEmailOtpLogin";

describe("useEmailOtpLogin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("send sets sent and starts cooldown", async () => {
    const port = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
      verifyOtp: vi.fn(),
    };
    const { result } = renderHook(() => useEmailOtpLogin(port, { resendCooldownSec: 30 }));

    act(() => {
      result.current.setEmail("test@xanki.local");
    });
    await act(async () => {
      await result.current.send();
    });

    expect(port.sendOtp).toHaveBeenCalledWith("test@xanki.local");
    expect(result.current.sent).toBe(true);
    expect(result.current.resendCooldown).toBe(30);
  });

  it("backToEmail clears otp step", async () => {
    const port = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
      verifyOtp: vi.fn(),
    };
    const { result } = renderHook(() => useEmailOtpLogin(port));

    act(() => {
      result.current.setEmail("test@xanki.local");
    });
    await act(async () => {
      await result.current.send();
    });
    act(() => {
      result.current.backToEmail();
    });

    expect(result.current.sent).toBe(false);
    expect(result.current.code).toBe("");
    expect(result.current.resendCooldown).toBe(0);
  });

  it("resend is blocked during cooldown", async () => {
    const port = {
      sendOtp: vi.fn().mockResolvedValue(undefined),
      verifyOtp: vi.fn(),
    };
    const { result } = renderHook(() => useEmailOtpLogin(port, { resendCooldownSec: 30 }));

    act(() => {
      result.current.setEmail("test@xanki.local");
    });
    await act(async () => {
      await result.current.send();
    });
    await act(async () => {
      await result.current.resend();
    });

    expect(port.sendOtp).toHaveBeenCalledTimes(1);
  });
});
