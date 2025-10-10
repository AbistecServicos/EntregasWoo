// src/components/OrderModal/DetalheLojaModal.js
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // Caminho corrigido

export default function DetalheLojaModal({ loja, isOpen, onClose, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    loja_nome: '',
    id_loja: '',
    loja_endereco: '',
    loja_telefone: '',
    cnpj: '',
    loja_perimetro_entrega: '',
    ativa: true,
    loja_logo: null
  });

  // Preencher formData quando a loja mudar ou o modal abrir
  useEffect(() => {
    if (loja) {
      setFormData({
        loja_nome: loja.loja_nome || '',
        id_loja: loja.id_loja || '',
        loja_endereco: loja.loja_endereco || '',
        loja_telefone: loja.loja_telefone || '',
        cnpj: loja.cnpj || '',
        loja_perimetro_entrega: loja.loja_perimetro_entrega || '',
        ativa: loja.ativa || false,
        loja_logo: null
      });
    }
  }, [loja, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      let loja_logo_url = loja.loja_logo;

      // Upload da nova logo se foi selecionada
      if (formData.loja_logo instanceof File) {
        console.log('🔄 Iniciando upload de logo...');
        console.log('📁 Arquivo:', formData.loja_logo.name, 'Tamanho:', formData.loja_logo.size);
        console.log('📋 Tipo MIME:', formData.loja_logo.type);
        console.log('📋 É File?', formData.loja_logo instanceof File);
        
        const fileExt = formData.loja_logo.name.split('.').pop();
        const fileName = `logo_loja_${formData.id_loja}_${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        console.log('📂 Caminho do arquivo:', filePath);

        // ✅ CORREÇÃO: Usar abordagem simples como no app antigo
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('box')
          .upload(filePath, formData.loja_logo, { 
            upsert: true 
          });

        if (uploadError) {
          console.error('❌ Erro no upload:', uploadError);
          throw uploadError;
        }

        console.log('✅ Upload concluído:', uploadData);

        const { data: { publicUrl } } = supabase.storage
          .from('box')
          .getPublicUrl(filePath);
        
        console.log('🔗 URL pública gerada:', publicUrl);
        loja_logo_url = publicUrl;
      }

      console.log('💾 Atualizando loja no banco...');
      console.log('🔗 Logo URL:', loja_logo_url);

      // Atualizar a loja
      const { data: updateData, error: updateError } = await supabase
        .from('lojas')
        .update({
          loja_nome: formData.loja_nome,
          id_loja: formData.id_loja,
          loja_endereco: formData.loja_endereco,
          loja_telefone: formData.loja_telefone,
          cnpj: formData.cnpj,
          loja_perimetro_entrega: formData.loja_perimetro_entrega,
          ativa: formData.ativa,
          loja_logo: loja_logo_url,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', loja.id);

      if (updateError) {
        console.error('❌ Erro ao atualizar loja:', updateError);
        throw updateError;
      }

      console.log('✅ Loja atualizada com sucesso:', updateData);

      onUpdate();
      onClose();
    } catch (err) {
      console.error('❌ Erro geral:', err);
      setError('Erro ao atualizar loja: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('📁 Arquivo selecionado:', file.name, 'Tipo:', file.type);
      setFormData(prev => ({
        ...prev,
        loja_logo: file
      }));
    }
  };

  // ✅ NOVO: Função para deletar logo atual
  const handleDeleteLogo = async () => {
    if (!loja?.loja_logo) return;
    
    try {
      setLoading(true);
      setError(null);

      // Extrair caminho do arquivo da URL
      const url = new URL(loja.loja_logo);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(4).join('/'); // Remove '/storage/v1/object/public/box/'

      // Deletar arquivo do storage
      const { error: deleteError } = await supabase.storage
        .from('box')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Atualizar loja no banco (remover URL da logo)
      const { error: updateError } = await supabase
        .from('lojas')
        .update({
          loja_logo: null,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', loja.id);

      if (updateError) throw updateError;

      alert('Logo removida com sucesso!');
      onUpdate();
      onClose();
    } catch (err) {
      console.error('❌ Erro ao deletar logo:', err);
      setError('Erro ao remover logo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Editar Loja: {loja?.loja_nome}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Loja *
              </label>
              <input
                type="text"
                name="loja_nome"
                value={formData.loja_nome}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID da Loja *
              </label>
              <input
                type="text"
                name="id_loja"
                value={formData.id_loja}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              <input
                type="text"
                name="loja_endereco"
                value={formData.loja_endereco}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="text"
                name="loja_telefone"
                value={formData.loja_telefone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ
              </label>
              <input
                type="text"
                name="cnpj"
                value={formData.cnpj}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perímetro de Entrega
              </label>
              <input
                type="text"
                name="loja_perimetro_entrega"
                value={formData.loja_perimetro_entrega}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo da Loja
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              
              {/* Preview da nova imagem selecionada */}
              {formData.loja_logo instanceof File && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Nova imagem selecionada:</p>
                  <img 
                    src={URL.createObjectURL(formData.loja_logo)}
                    alt="Preview da nova imagem"
                    className="h-16 w-auto object-contain border rounded mt-1"
                  />
                </div>
              )}
              
              {/* Logo atual (se não houver nova imagem selecionada) */}
              {loja?.loja_logo && !(formData.loja_logo instanceof File) && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Logo atual:</p>
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      🗑️ Remover Logo
                    </button>
                  </div>
                  <img 
                    src={loja.loja_logo}
                    alt={`Logo ${loja.loja_nome}`}
                    className="h-16 w-auto object-contain border rounded mt-1"
                    onError={(e) => {
                      console.log('❌ Erro ao carregar imagem atual:', loja.loja_logo);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="ativa"
                  checked={formData.ativa}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Loja Ativa</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}