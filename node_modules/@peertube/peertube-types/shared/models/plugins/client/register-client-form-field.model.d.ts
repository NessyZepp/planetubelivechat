export type RegisterClientFormFieldOptions = {
    name?: string;
    label?: string;
    type: 'input' | 'input-checkbox' | 'input-password' | 'input-textarea' | 'markdown-text' | 'markdown-enhanced' | 'select' | 'html';
    options?: {
        value: string;
        label: string;
    }[];
    html?: string;
    descriptionHTML?: string;
    default?: string | boolean;
    hidden?: (options: any) => boolean;
    error?: (options: any) => Promise<{
        error: boolean;
        text?: string;
    }>;
};
export interface RegisterClientVideoFieldOptions {
    type: 'update' | 'upload' | 'import-url' | 'import-torrent' | 'go-live';
    tab?: 'main' | 'plugin-settings';
}
//# sourceMappingURL=register-client-form-field.model.d.ts.map