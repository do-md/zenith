import { createContext, useContext, useState } from "react";
import { BaseStore } from "../core/BaseStore";
import { useStoreSelector } from "./useStoreSelector";

type ConstructorParameters<T> = T extends new (props: infer P) => any ? P : never;

type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : never;

export function createReactStore<TStoreConstructor extends new (props: any) => BaseStore<any>>(
    StoreClass: TStoreConstructor
) {
    type TStore = InstanceType<TStoreConstructor>
    type TProps = ConstructorParameters<TStoreConstructor>

    const StoreContext = createContext<TStore | null>(null)

    const StoreProvider = ({ children, initialProps }: { children: React.ReactNode, initialProps: TProps }) => {
        const [store] = useState<TStore>(() => new StoreClass(initialProps) as TStore)
        return <StoreContext.Provider value={store}> {children} </StoreContext.Provider>
    }

    const useStoreApi = () => {
        const store = useContext(StoreContext)
        if (!store) {
            throw new Error('useStore must be used within a StoreProvider')
        }
        return store
    }

    const useStore = <T,>(selector: (store: TStore) => T): T => {
        const store = useContext(StoreContext)
        if (!store) {
            throw new Error('useStore must be used within a StoreProvider')
        }
        return useStoreSelector(store, selector)
    }

    return { StoreProvider, useStoreApi, useStore }
}