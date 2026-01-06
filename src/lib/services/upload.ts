
import { supabase } from "../supabase/client";

export const UploadService = {
    /**
     * Uploads a file to Supabase Storage and records it in the documents table.
     * @param file The file object to upload
     * @param applicationId The application UUID this document belongs to
     * @param userId The user uploading the document (optional)
     */
    async uploadDocument(file: File, applicationId: string, userId: string = 'system') {
        const fileExt = file.name.split('.').pop();
        const fileName = `${applicationId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 1. Upload to Storage 'documents' bucket
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload Error:', uploadError);
            throw new Error('File upload failed');
        }

        // 2. Get Public URL (or signed URL if private)
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        // 3. Insert into 'documents' table
        const { data: doc, error: dbError } = await supabase
            .from('documents')
            .insert({
                application_id: applicationId,
                file_name: file.name,
                file_path: publicUrl,
                file_size: file.size,
                mime_type: file.type,
                user_id: userId,
                verification_status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database Insert Error:', dbError);
            throw new Error('File record creation failed');
        }

        return doc;
    }
};
