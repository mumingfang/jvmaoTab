import * as React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import DelayedMount from "~/components/DelayedMount";
import PageLoading from "~/components/PageLoading";

const Home = React.lazy(() => import("~/view/Home"));
const LinkHome = React.lazy(() => import("~/scenes/Link"));
const NoteHome = React.lazy(() => import("~/scenes/note"));

export default () => {
    return (
        <React.Suspense
            fallback={
                <DelayedMount delay={200}>
                    <PageLoading />
                </DelayedMount>
            }
        >
            <HashRouter
                future={{
                    v7_startTransition: true,
                }}
            >
                <Routes>
                    <Route path="/" element={<Home />}>
                        <Route index element={<LinkHome />} />
                        <Route path="/note" element={<NoteHome />} />
                    </Route>
                </Routes>
            </HashRouter>
        </React.Suspense>
    )
}