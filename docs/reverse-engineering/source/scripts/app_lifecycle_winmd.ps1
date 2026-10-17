$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.IO;
using System.Collections.Generic;
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;
public static class AppLifecycleMetadata {
  public static object[] Read(string path, string[] selected) {
    var rows = new List<object>();
    var names = new HashSet<string>(selected);
    using(var stream=File.OpenRead(path)) using(var pe=new PEReader(stream)) {
      var reader=pe.GetMetadataReader(MetadataReaderOptions.None);
      foreach(var handle in reader.TypeDefinitions) {
        var td=reader.GetTypeDefinition(handle);
        string name=reader.GetString(td.Name);
        if(!names.Contains(name)) continue;
        var methods=new List<object>(); int index=0;
        foreach(var mh in td.GetMethods()) {
          var m=reader.GetMethodDefinition(mh);
          methods.Add(new { index=index++, name=reader.GetString(m.Name), signature=Convert.ToHexString(reader.GetBlobBytes(m.Signature)) });
        }
        var fields=new List<object>();
        foreach(var fh in td.GetFields()) {
          var f=reader.GetFieldDefinition(fh); var ch=f.GetDefaultValue(); string value=null,kind=null;
          if(!ch.IsNil) {var c=reader.GetConstant(ch);value=Convert.ToHexString(reader.GetBlobBytes(c.Value));kind=c.TypeCode.ToString();}
          fields.Add(new {name=reader.GetString(f.Name),constantType=kind,constantBytes=value});
        }
        var attributes=new List<object>();
        foreach(var ah in td.GetCustomAttributes()) {
          var a=reader.GetCustomAttribute(ah); EntityHandle owner=default(EntityHandle);
          if(a.Constructor.Kind==HandleKind.MemberReference) owner=reader.GetMemberReference((MemberReferenceHandle)a.Constructor).Parent;
          else if(a.Constructor.Kind==HandleKind.MethodDefinition) owner=reader.GetMethodDefinition((MethodDefinitionHandle)a.Constructor).GetDeclaringType();
          string an="";
          if(owner.Kind==HandleKind.TypeReference) {var tr=reader.GetTypeReference((TypeReferenceHandle)owner);an=reader.GetString(tr.Namespace)+"."+reader.GetString(tr.Name);}
          else if(owner.Kind==HandleKind.TypeDefinition) {var tr=reader.GetTypeDefinition((TypeDefinitionHandle)owner);an=reader.GetString(tr.Namespace)+"."+reader.GetString(tr.Name);}
          var bytes=reader.GetBlobBytes(a.Value);string guid=null;
          if(an=="Windows.Foundation.Metadata.GuidAttribute" && bytes.Length>=18 && bytes[0]==1 && bytes[1]==0) {
            byte[] g=new byte[16]; Array.Copy(bytes,2,g,0,16);guid=new Guid(g).ToString();
          }
          attributes.Add(new {name=an,blob=Convert.ToHexString(bytes),guid=guid});
        }
        rows.Add(new {name=name,ns=reader.GetString(td.Namespace),methods=methods,fields=fields,attributes=attributes});
      }
    }
    return rows.ToArray();
  }
}
'@
$runtimePath = Split-Path -Parent ([System.Reflection.Metadata.MetadataReader].Assembly.Location)
$referencePaths = Get-ChildItem -LiteralPath (Join-Path $runtimePath 'ref') -Filter '*.dll' | Select-Object -ExpandProperty FullName
Add-Type -TypeDefinition $source -ReferencedAssemblies $referencePaths
$selected = @('IApplicationStatics','IApplicationStatics2','IApplication','IApplication2','IApplication3','IApplicationFactory','IApplicationOverrides','IActivatedEventArgs','ISuspendingDeferral','ILeavingBackgroundEventArgs','IEnteredBackgroundEventArgs','ApplicationExecutionState','IWindow','IWindowStatics','IFrameworkElement','IFrameworkElement2','IContentControl','IDispatcherTimer','IFrame','IFrameFactory','INavigationEventArgs','INavigationFailedEventArgs','IApplicationLanguagesStatics','IFileSavePicker','IFileSavePickerFactory','PickerLocationId','IMessageDialog','IMessageDialogFactory','ILaunchActivatedEventArgs','ISuspendingEventArgs','ISuspendingOperation','IPage','IPageOverrides')
$files = @('Windows.UI.Xaml.winmd','Windows.Globalization.winmd','Windows.Storage.winmd','Windows.UI.winmd','Windows.ApplicationModel.winmd')
$rows = foreach($name in $files) {
  $path = Join-Path 'C:\Windows\System32\WinMetadata' $name
  if(Test-Path -LiteralPath $path) {
    [PSCustomObject]@{path=$path;sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant();types=[AppLifecycleMetadata]::Read($path,$selected)}
  }
}
$taskRoot = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $taskRoot 'evidence\app-lifecycle\system-winmd.json'
[IO.File]::WriteAllText($dest,($rows | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
$rows | ForEach-Object { [PSCustomObject]@{path=$_.path;types=$_.types.Count;sha256=$_.sha256} } | ConvertTo-Json
