# source venv/bin/activate

import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000/")
    with page.expect_popup() as page1_info:
        page.get_by_role("button", name="Sign In with Microsoft").click()
    page1 = page1_info.value
    page1.get_by_role("textbox", name="Enter your email, phone, or").click()
    page1.get_by_role("textbox", name="Enter your email, phone, or").fill(
        "ham1@1742vr.onmicrosoft.com")
    page1.get_by_role("button", name="Next").click()
    page1.get_by_role("textbox", name="Enter the password for ham1@").click()
    page1.get_by_role(
        "textbox", name="Enter the password for ham1@").fill("xxxxPASSWORDxxxx")
    page1.get_by_role("button", name="Sign in").click()
    page1.get_by_role("button", name="Yes").click()
    page1.close()
    page.goto("http://localhost:3000/")
    page.get_by_text("ham1@1742vr.onmicrosoft.com").click()
    page.get_by_text("AdeleV@1742vr.onmicrosoft.com").click()
    page.get_by_role("button", name="Next").click()
    page.get_by_role("list").get_by_text("ham1@1742vr.onmicrosoft.com").click()
    page.get_by_role("button", name="Next").click()
    page.get_by_role("button", name="Next").click()
    page.get_by_role("button", name="Next").click()
    page.get_by_text("wutchara@1742vr.onmicrosoft.").click()
    page.get_by_role("button", name="Sign Out").click()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
